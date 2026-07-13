/**
 * Integration tests — requires `firebase emulators:start --only firestore,storage`
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';

import { FieldValue } from 'firebase-admin/firestore';
import { db, bucket } from '@/config/firebase.js';
import {
  addImageToLibrary,
  fetchGeneratedAvatars,
  fetchPublicAvatarsRepo,
  getPermanentUrl,
  uploadImage,
  getAvatarById,
} from './avatars.repository.js';
import { TestFactory } from '@/test/factories.js';

const TEST_USER_ID = TestFactory.USER_ID;

async function clearUserImages(userId: string) {
  const ref = db.collection('users').doc(userId).collection('generated-images');
  const docs = await ref.listDocuments();
  const batch = db.batch();
  docs.forEach((d) => batch.delete(d));
  await batch.commit();
}

async function clearPublicAvatars() {
  const docs = await db.collection('avatars').listDocuments();
  const batch = db.batch();
  docs.forEach((d) => batch.delete(d));
  await batch.commit();
}

// Integration tests write to Firestore so they need a server-timestamp sentinel.
const makeImage = (
  overrides: Parameters<typeof TestFactory.generatedImage>[1] = {},
) =>
  TestFactory.generatedImage(TEST_USER_ID, {
    createdAt: FieldValue.serverTimestamp(),
    ...overrides,
  });

describe('addImageToLibrary', () => {
  afterEach(() => clearUserImages(TEST_USER_ID));

  it('creates a document and returns a string ID', async () => {
    const id = await addImageToLibrary(TEST_USER_ID, makeImage());

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('stores the document in the correct subcollection', async () => {
    const id = await addImageToLibrary(
      TEST_USER_ID,
      makeImage({ prompt: 'a dog' }),
    );

    const doc = await db
      .collection('users')
      .doc(TEST_USER_ID)
      .collection('generated-images')
      .doc(id)
      .get();

    expect(doc.exists).toBe(true);
    expect(doc.data()?.['prompt']).toBe('a dog');
  });
});

describe('fetchGeneratedAvatars', () => {
  afterEach(() => clearUserImages(TEST_USER_ID));

  it('returns an empty array when the user has no images', async () => {
    const result = await fetchGeneratedAvatars(TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('returns all images for the user', async () => {
    await addImageToLibrary(TEST_USER_ID, makeImage());
    await addImageToLibrary(TEST_USER_ID, makeImage({ prompt: 'a robot' }));

    const result = await fetchGeneratedAvatars(TEST_USER_ID);

    expect(result).toHaveLength(2);
  });

  it('strips storagePath and extracts name from it', async () => {
    await addImageToLibrary(
      TEST_USER_ID,
      makeImage({
        storagePath: `users/${TEST_USER_ID}/generated-avatars/my-avatar.png`,
      }),
    );

    const result = await fetchGeneratedAvatars(TEST_USER_ID);

    expect(result[0]).not.toHaveProperty('storagePath');
    expect(result[0]?.name).toBe('my-avatar.png');
  });

  it('includes the Firestore document ID as id', async () => {
    const docId = await addImageToLibrary(TEST_USER_ID, makeImage());

    const result = await fetchGeneratedAvatars(TEST_USER_ID);

    expect(result[0]?.id).toBe(docId);
  });
});

describe('fetchPublicAvatarsRepo', () => {
  beforeEach(() => clearPublicAvatars());
  afterEach(() => clearPublicAvatars());

  it('returns an empty array when the collection is empty', async () => {
    const result = await fetchPublicAvatarsRepo();
    expect(result).toEqual([]);
  });

  it('returns all documents from the avatars collection', async () => {
    await db
      .collection('avatars')
      .add({ name: 'avatar-1.png', category: 'animals' });
    await db
      .collection('avatars')
      .add({ name: 'avatar-2.png', category: 'people' });

    const result = await fetchPublicAvatarsRepo();

    expect(result).toHaveLength(2);
    expect(result.map((r) => r['name'])).toEqual(
      expect.arrayContaining(['avatar-1.png', 'avatar-2.png']),
    );
  });
});

describe('getPermanentUrl', () => {
  it('constructs the correct Firebase Storage download URL', () => {
    const url = getPermanentUrl(
      'my-bucket',
      'users%2Fu1%2Fimg.png',
      'token-abc',
    );

    expect(url).toContain('my-bucket');
    expect(url).toContain('users%2Fu1%2Fimg.png');
    expect(url).toContain('token-abc');
    expect(url).toContain('alt=media');
  });
});

const UPLOAD_PATH = `users/${TEST_USER_ID}/generated-avatars/test-upload.png`;
const FAKE_FILE = {
  buffer: Buffer.from('fake-png-bytes'),
  mimetype: 'image/png',
  originalname: 'test-upload.png',
} as Express.Multer.File;

describe('uploadImage', () => {
  afterEach(async () => {
    const [exists] = await bucket.file(UPLOAD_PATH).exists();
    if (exists) await bucket.file(UPLOAD_PATH).delete();
  });

  it('uploads the file so it exists in storage', async () => {
    await uploadImage(UPLOAD_PATH, FAKE_FILE, 'test-token');

    const [exists] = await bucket.file(UPLOAD_PATH).exists();
    expect(exists).toBe(true);
  });

  it('sets the correct content type on the uploaded file', async () => {
    await uploadImage(UPLOAD_PATH, FAKE_FILE, 'test-token');

    const [metadata] = await bucket.file(UPLOAD_PATH).getMetadata();
    expect(metadata.contentType).toBe('image/png');
  });

  it('stores the download token in the file metadata', async () => {
    await uploadImage(UPLOAD_PATH, FAKE_FILE, 'my-download-token');

    const [metadata] = await bucket.file(UPLOAD_PATH).getMetadata();
    expect(
      (metadata.metadata as Record<string, string> | undefined)
        ?.firebaseStorageDownloadTokens,
    ).toBe('my-download-token');
  });
});

describe('getAvatarById', () => {
  afterEach(() => clearUserImages(TEST_USER_ID));

  it('returns undefined when the document does not exist', async () => {
    const result = await getAvatarById('non-existent-id', TEST_USER_ID);

    expect(result).toBeUndefined();
  });

  it('returns the avatar data when the document exists', async () => {
    const id = await addImageToLibrary(
      TEST_USER_ID,
      makeImage({ prompt: 'space warrior' }),
    );

    const result = await getAvatarById(id, TEST_USER_ID);

    expect(result?.prompt).toBe('space warrior');
    expect(result?.extension).toBe('png');
  });

  it('returns adjustments and preset when stored on the document', async () => {
    const adjustments = { brightness: 0.5, contrast: 0.2 };
    const id = await addImageToLibrary(
      TEST_USER_ID,
      makeImage({ adjustments, preset: 'grayscale' }),
    );

    const result = await getAvatarById(id, TEST_USER_ID);

    expect(result?.adjustments).toEqual(adjustments);
    expect(result?.preset).toBe('grayscale');
  });

  it('returns undefined for a document belonging to a different user', async () => {
    const id = await addImageToLibrary(TEST_USER_ID, makeImage());

    const result = await getAvatarById(id, 'other-user-id');

    expect(result).toBeUndefined();
  });
});
