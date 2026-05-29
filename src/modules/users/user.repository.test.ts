/**
 * Integration tests — requires `firebase emulators:start --only firestore,storage`
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/config/firebase.js';
import {
  getUserProfileData,
  updateUserProfile,
  checkIsDocExists,
  getUserRef,
  runUpdateCreditTransaction,
  incrementCredits,
} from './user.repository.js';
import { userProfileConverter } from './converter.js';
import { NotFoundError } from '@/utils/errors/ApiErrors.js';
import { TestFactory } from '@/test/factories.js';

const TEST_USER_ID = TestFactory.USER_ID;
const BASE_PROFILE = TestFactory.userProfile();

async function createUser(
  userId: string,
  overrides: Parameters<typeof TestFactory.userProfile>[0] = {},
) {
  await db
    .collection('users')
    .doc(userId)
    .withConverter(userProfileConverter)
    .set(TestFactory.userProfile(overrides));
}

async function deleteUser(userId: string) {
  await db.collection('users').doc(userId).delete();
}

// ── getUserProfileData ─────────────────────────────────────────────────────

describe('getUserProfileData', () => {
  beforeEach(() => createUser(TEST_USER_ID));
  afterEach(() => deleteUser(TEST_USER_ID));

  it('returns a snapshot with the correct profile data', async () => {
    const doc = await getUserProfileData(TEST_USER_ID);

    expect(doc.exists).toBe(true);
    expect(doc.data()).toMatchObject({
      displayName: BASE_PROFILE.displayName,
      email: BASE_PROFILE.email,
      credits: BASE_PROFILE.credits,
      createdAt: expect.any(Date),
    });
  });

  it('returns a non-existent snapshot for a missing user', async () => {
    const doc = await getUserProfileData('does-not-exist');

    expect(doc.exists).toBe(false);
    expect(doc.data()).toBeUndefined();
  });
});

// ── updateUserProfile ──────────────────────────────────────────────────────

describe('updateUserProfile', () => {
  beforeEach(() => createUser(TEST_USER_ID));
  afterEach(() => deleteUser(TEST_USER_ID));

  it('updates the specified field', async () => {
    await updateUserProfile(TEST_USER_ID, { displayName: 'Updated Name' });

    const doc = await getUserProfileData(TEST_USER_ID);
    expect(doc.data()?.displayName).toBe('Updated Name');
  });

  it('does not overwrite unrelated fields', async () => {
    await updateUserProfile(TEST_USER_ID, { displayName: 'New Name' });

    const doc = await getUserProfileData(TEST_USER_ID);
    expect(doc.data()?.email).toBe(BASE_PROFILE.email);
    expect(doc.data()?.credits).toBe(BASE_PROFILE.credits);
  });

  it('can update credits independently', async () => {
    await updateUserProfile(TEST_USER_ID, { credits: 42 });

    const doc = await getUserProfileData(TEST_USER_ID);
    expect(doc.data()?.credits).toBe(42);
  });
});

// ── checkIsDocExists ───────────────────────────────────────────────────────

describe('checkIsDocExists', () => {
  it('returns true for an existing document', async () => {
    await createUser(TEST_USER_ID);
    const doc = await db.collection('users').doc(TEST_USER_ID).get();

    expect(checkIsDocExists(doc)).toBe(true);

    await deleteUser(TEST_USER_ID);
  });

  it('returns false for a missing document', async () => {
    const doc = await db.collection('users').doc('never-created').get();

    expect(checkIsDocExists(doc)).toBe(false);
  });
});

// ── getUserRef ─────────────────────────────────────────────────────────────

describe('getUserRef', () => {
  it('returns a DocumentReference pointing to the correct Firestore path', () => {
    const ref = getUserRef('user-abc');

    expect(ref.path).toBe('users/user-abc');
  });

  it('uses the provided userId as the document ID', () => {
    const ref = getUserRef('another-user');

    expect(ref.id).toBe('another-user');
  });
});

// ── runUpdateCreditTransaction ─────────────────────────────────────────────

describe('runUpdateCreditTransaction', () => {
  beforeEach(() => createUser(TEST_USER_ID, { credits: 10 }));
  afterEach(() => deleteUser(TEST_USER_ID));

  it('applies the update function and returns the new credit balance', async () => {
    const newCredits = await runUpdateCreditTransaction(
      TEST_USER_ID,
      (current) => current + 5,
    );

    expect(newCredits).toBe(15);
  });

  it('persists the updated credit balance in Firestore', async () => {
    await runUpdateCreditTransaction(TEST_USER_ID, (current) => current - 3);

    const doc = await getUserProfileData(TEST_USER_ID);
    expect(doc.data()?.credits).toBe(7);
  });

  it('throws NotFoundError when the user document does not exist', async () => {
    await expect(
      runUpdateCreditTransaction('missing-user', (c) => c + 1),
    ).rejects.toThrow(NotFoundError);

    await expect(
      runUpdateCreditTransaction('missing-user', (c) => c + 1),
    ).rejects.toThrow('User profile not found.');
  });

  it('rolls back when the update function throws', async () => {
    await expect(
      runUpdateCreditTransaction(TEST_USER_ID, () => {
        throw new Error('update aborted');
      }),
    ).rejects.toThrow('update aborted');

    const doc = await getUserProfileData(TEST_USER_ID);
    expect(doc.data()?.credits).toBe(10);
  });
});

// ── incrementCredits ───────────────────────────────────────────────────────

describe('incrementCredits', () => {
  beforeEach(() => createUser(TEST_USER_ID, { credits: 5 }));
  afterEach(() => deleteUser(TEST_USER_ID));

  it('increments credits by the given amount', async () => {
    await incrementCredits(TEST_USER_ID, 3);

    const doc = await getUserProfileData(TEST_USER_ID);
    expect(doc.data()?.credits).toBe(8);
  });

  it('handles incrementing by zero without changing the balance', async () => {
    await incrementCredits(TEST_USER_ID, 0);

    const doc = await getUserProfileData(TEST_USER_ID);
    expect(doc.data()?.credits).toBe(5);
  });

  it('handles negative increments (deduction)', async () => {
    await incrementCredits(TEST_USER_ID, -2);

    const doc = await getUserProfileData(TEST_USER_ID);
    expect(doc.data()?.credits).toBe(3);
  });
});
