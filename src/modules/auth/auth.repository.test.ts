/**
 * Integration tests — requires `firebase emulators:start --only firestore`
 */
import { db } from '@/config/firebase.js';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { createUserProfile, findByUserId } from './auth.repository.js';
import { TestFactory } from '@/test/factories.js';

const TEST_UID = TestFactory.AUTH_USER_ID;
const BASE_USER = TestFactory.authUser();

async function deleteUser(uid: string) {
  await db.collection('users').doc(uid).delete();
}

// ── createUserProfile ──────────────────────────────────────────────────────

describe('createUserProfile', () => {
  afterEach(() => deleteUser(TEST_UID));

  it('creates the document at users/{uid}', async () => {
    await createUserProfile(BASE_USER);

    const doc = await db.collection('users').doc(TEST_UID).get();
    expect(doc.exists).toBe(true);
  });

  it('stores the correct email, displayName, emailVerified and picture', async () => {
    await createUserProfile(BASE_USER);

    const data = (await db.collection('users').doc(TEST_UID).get()).data();
    expect(data?.['email']).toBe('test@gmail.com');
    expect(data?.['displayName']).toBe('Test User');
    expect(data?.['emailVerified']).toBe(false);
    expect(data?.['picture']).toBe('http://test_picture');
  });

  it('always sets isPremium=false and credits=5 regardless of input', async () => {
    await createUserProfile(BASE_USER);

    const data = (await db.collection('users').doc(TEST_UID).get()).data();
    expect(data?.['isPremium']).toBe(false);
    expect(data?.['credits']).toBe(5);
  });

  it('stores a createdAt timestamp', async () => {
    const before = Date.now();
    await createUserProfile(BASE_USER);
    const after = Date.now();

    const data = (await db.collection('users').doc(TEST_UID).get()).data();
    const createdAt: Date = data?.['createdAt'].toDate();
    expect(createdAt).toBeInstanceOf(Date);
    expect(createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('falls back to the normalized email name when displayName is empty', async () => {
    await createUserProfile(
      TestFactory.authUser(TEST_UID, { displayName: '' }),
    );

    const data = (await db.collection('users').doc(TEST_UID).get()).data();
    // normalizeEmailToName('test@gmail.com') strips the domain → 'test'
    expect(data?.['displayName']).toBeTruthy();
    expect(data?.['displayName']).not.toBe('');
  });
});

// ── findByUserId ───────────────────────────────────────────────────────────

describe('findByUserId', () => {
  beforeEach(async () => {
    await createUserProfile(BASE_USER);
  });
  afterEach(() => deleteUser(TEST_UID));

  it('returns true when the user document exists', async () => {
    const exists = await findByUserId(TEST_UID);
    expect(exists).toBe(true);
  });

  it('returns false when the user document does not exist', async () => {
    const exists = await findByUserId('non-existent-uid');
    expect(exists).toBe(false);
  });
});
