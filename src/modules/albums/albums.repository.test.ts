/**
 * Integration tests — requires `firebase emulators:start --only firestore,storage`
 */
import { describe, it, afterEach, expect } from 'vitest';
import { db } from '@/config/firebase.js';
import {
  fetchUserAlbums,
  fetchAlbumById,
  fetchAlbumAvatars,
  fetchAlbumAvatarById,
  createAlbumDoc,
  insertAvatarIntoAlbum,
  updateAlbumDoc,
  deleteAlbum,
  fetchGeneratedImageById,
  findAlbumAvatarByAvatarId,
  deleteAvatarFromAlbum,
} from './albums.repository.js';
import { generatedImageConverter } from '@/modules/avatars/converter.js';
import type { GeneratedImage } from '@/modules/avatars/types.js';
import { TestFactory } from '@/test/factories.js';

const TEST_USER_ID = TestFactory.ALBUMS_USER_ID;
const OTHER_USER_ID = TestFactory.ALBUMS_OTHER_USER_ID;

const BASE_AVATAR = TestFactory.albumAvatarData();
const BASE_ALBUM = TestFactory.albumData(TEST_USER_ID);

const BASE_GENERATED_IMAGE: GeneratedImage = TestFactory.generatedImage(
  TEST_USER_ID,
  {
    url: 'https://example.com/generated.png',
    prompt: 'a test generated image',
    storagePath: `users/${TEST_USER_ID}/generated-images/test-image-id`,
  },
);

async function deleteAlbums(userId: string) {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function seedGeneratedImage(
  userId: string,
  imageId: string,
  data: GeneratedImage,
) {
  await db
    .collection('users')
    .doc(userId)
    .collection('generated-images')
    .doc(imageId)
    .withConverter(generatedImageConverter)
    .set(data);
}

async function deleteGeneratedImages(userId: string) {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('generated-images')
    .get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

// ── fetchUserAlbums ────────────────────────────────────────────────────────
describe('fetchUserAlbums', () => {
  afterEach(async () => {
    await deleteAlbums(TEST_USER_ID);
    await deleteAlbums(OTHER_USER_ID);
  });

  it('returns an empty array when the user has no albums', async () => {
    const albums = await fetchUserAlbums(TEST_USER_ID);
    expect(albums).toEqual([]);
  });

  it('returns all albums belonging to the user', async () => {
    await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    await createAlbumDoc(TEST_USER_ID, { ...BASE_ALBUM, name: 'Second Album' });

    const albums = await fetchUserAlbums(TEST_USER_ID);
    expect(albums).toHaveLength(2);
  });

  it('returns albums with correctly mapped fields', async () => {
    await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);

    const albums = await fetchUserAlbums(TEST_USER_ID);

    expect(albums).toHaveLength(1);
    expect(albums).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: TEST_USER_ID,
          name: 'My Album',
          avatarCount: 0,
        }),
      ]),
    );
    expect(albums[0]?.id).toBeDefined();
    expect(albums[0]?.createdAt).toBeInstanceOf(Date);
    expect(albums[0]?.updatedAt).toBeInstanceOf(Date);
  });

  it('does not return albums belonging to another user', async () => {
    await createAlbumDoc(OTHER_USER_ID, {
      ...BASE_ALBUM,
      userId: OTHER_USER_ID,
    });

    const albums = await fetchUserAlbums(TEST_USER_ID);
    expect(albums).toHaveLength(0);
  });
});

// ── createAlbumDoc ────────────────────────────────────────────────────────
describe('createAlbumDoc', () => {
  afterEach(async () => {
    await deleteAlbums(TEST_USER_ID);
  });
  it('creates a document in the user albums collection', async () => {
    await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    const res = await db
      .collection('users')
      .doc(TEST_USER_ID)
      .collection('albums')
      .count()
      .get();
    const count = res.data().count;
    expect(count).toBe(1);
  });

  it('creates the document with correct fields and returns it', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);

    // return value
    expect(typeof album.id).toBe('string');
    expect(album.id.length).toBeGreaterThan(0);
    expect(album.name).toBe('My Album');
    expect(album.userId).toBe(TEST_USER_ID);
    expect(album.avatarCount).toBe(0);

    // document actually stored at that id
    const doc = await db
      .collection('users')
      .doc(TEST_USER_ID)
      .collection('albums')
      .doc(album.id)
      .get();

    expect(doc.exists).toBe(true);
    expect(doc.data()?.['name']).toBe('My Album');
    expect(doc.data()?.['userId']).toBe(TEST_USER_ID);
  });
});

// ── fetchAlbumById ────────────────────────────────────────────────────────
describe('fetchAlbumById', () => {
  afterEach(() => deleteAlbums(TEST_USER_ID));

  it('returns the album with mapped fields when the id exists', async () => {
    const created = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);

    const album = await fetchAlbumById(created.id, TEST_USER_ID);

    expect(album).toBeDefined();
    expect(album?.id).toBe(created.id);
    expect(album?.name).toBe('My Album');
    expect(album?.userId).toBe(TEST_USER_ID);
    expect(album?.avatarCount).toBe(0);
    expect(album?.createdAt).toBeInstanceOf(Date);
    expect(album?.updatedAt).toBeInstanceOf(Date);
  });

  it('returns undefined when the album does not exist', async () => {
    const album = await fetchAlbumById('nonexistent-id', TEST_USER_ID);
    expect(album).toBeUndefined();
  });
});

// ── fetchAlbumAvatars ──────────────────────────────────────────────────────
describe('fetchAlbumAvatars', () => {
  afterEach(() => deleteAlbums(TEST_USER_ID));
  it("returns the album's avatars", async () => {
    const created = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    const avatarDocId = await insertAvatarIntoAlbum(
      created.id,
      TEST_USER_ID,
      BASE_AVATAR,
    );
    const avatars = await fetchAlbumAvatars(created.id, TEST_USER_ID);

    expect(avatars.length).toBe(1);

    const avatar = avatars[0];
    expect(avatar).toBeDefined();
    expect(avatar?.id).toBe(avatarDocId);
    expect(avatar?.avatarId).toBe(BASE_AVATAR.avatarId);
    expect(avatar?.prompt).toBe(BASE_AVATAR.prompt);
    expect(avatar?.extension).toBe(BASE_AVATAR.extension);
    expect(avatar?.url).toBe(BASE_AVATAR.url);
    expect(avatar?.createdAt).toBe(BASE_AVATAR.createdAt);
  });

  it('return empty array when there is no avatars inside album', async () => {
    const created = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    const avatars = await fetchAlbumAvatars(created.id, TEST_USER_ID);
    expect(avatars.length).toBe(0);
  });
});

// ── fetchAlbumAvatarById ──────────────────────────────────────────────────────
describe('fetchAlbumAvatarById', () => {
  afterEach(() => deleteAlbums(TEST_USER_ID));

  it('returns the avatar with mapped fields when it exists', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    const avatarDocId = await insertAvatarIntoAlbum(
      album.id,
      TEST_USER_ID,
      BASE_AVATAR,
    );

    const avatar = await fetchAlbumAvatarById(
      album.id,
      TEST_USER_ID,
      avatarDocId,
    );

    expect(avatar).toBeDefined();
    expect(avatar?.id).toBe(avatarDocId);
    expect(avatar?.avatarId).toBe(BASE_AVATAR.avatarId);
    expect(avatar?.url).toBe(BASE_AVATAR.url);
    expect(avatar?.prompt).toBe(BASE_AVATAR.prompt);
    expect(avatar?.extension).toBe(BASE_AVATAR.extension);
    expect(avatar?.createdAt).toBe(BASE_AVATAR.createdAt);
  });

  it('returns undefined when the avatar does not exist', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);

    const avatar = await fetchAlbumAvatarById(
      album.id,
      TEST_USER_ID,
      'nonexistent-id',
    );
    expect(avatar).toBeUndefined();
  });
});

// ── updateAlbumDoc ────────────────────────────────────────────────────────
describe('updateAlbumDoc', () => {
  afterEach(() => deleteAlbums(TEST_USER_ID));

  it('updates the specified fields on the album', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    await updateAlbumDoc(album.id, TEST_USER_ID, { name: 'Renamed Album' });

    const data = (
      await db
        .collection('users')
        .doc(TEST_USER_ID)
        .collection('albums')
        .doc(album.id)
        .get()
    ).data();

    expect(data?.['name']).toBe('Renamed Album');
  });

  it('does not overwrite fields not included in the payload', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    await updateAlbumDoc(album.id, TEST_USER_ID, { name: 'New Name' });

    const data = (
      await db
        .collection('users')
        .doc(TEST_USER_ID)
        .collection('albums')
        .doc(album.id)
        .get()
    ).data();

    expect(data?.['userId']).toBe(TEST_USER_ID);
    expect(data?.['avatarCount']).toBe(0);
  });

  it('sets updatedAt to the current server timestamp after update', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    const before = Date.now();
    await updateAlbumDoc(album.id, TEST_USER_ID, { name: 'Updated' });
    const after = Date.now();

    const data = (
      await db
        .collection('users')
        .doc(TEST_USER_ID)
        .collection('albums')
        .doc(album.id)
        .get()
    ).data();

    const updatedAt: Date = data?.['updatedAt'].toDate();
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(updatedAt.getTime()).toBeLessThanOrEqual(after);
  });
});

// ── deleteAlbum ───────────────────────────────────────────────────────────
describe('deleteAlbum', () => {
  afterEach(() => deleteAlbums(TEST_USER_ID));

  it('removes the album document', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    await deleteAlbum(album.id, TEST_USER_ID);

    const doc = await db
      .collection('users')
      .doc(TEST_USER_ID)
      .collection('albums')
      .doc(album.id)
      .get();

    expect(doc.exists).toBe(false);
  });

  it('also removes all avatars inside the album', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    await insertAvatarIntoAlbum(album.id, TEST_USER_ID, BASE_AVATAR);
    await insertAvatarIntoAlbum(album.id, TEST_USER_ID, BASE_AVATAR);

    await deleteAlbum(album.id, TEST_USER_ID);

    const avatarsSnapshot = await db
      .collection('users')
      .doc(TEST_USER_ID)
      .collection('albums')
      .doc(album.id)
      .collection('avatars')
      .get();

    expect(avatarsSnapshot.empty).toBe(true);
  });
});

// ── fetchGeneratedImageById ───────────────────────────────────────────────
describe('fetchGeneratedImageById', () => {
  const TEST_IMAGE_ID = 'test-generated-image';

  afterEach(() => deleteGeneratedImages(TEST_USER_ID));

  it('returns the image with mapped fields when it exists', async () => {
    await seedGeneratedImage(TEST_USER_ID, TEST_IMAGE_ID, BASE_GENERATED_IMAGE);

    const image = await fetchGeneratedImageById(TEST_USER_ID, TEST_IMAGE_ID);

    expect(image).toBeDefined();
    expect(image?.url).toBe(BASE_GENERATED_IMAGE.url);
    expect(image?.prompt).toBe(BASE_GENERATED_IMAGE.prompt);
    expect(image?.extension).toBe(BASE_GENERATED_IMAGE.extension);
    expect(image?.storagePath).toBe(BASE_GENERATED_IMAGE.storagePath);
    expect(image?.createdAt).toBeInstanceOf(Date);
  });

  it('returns undefined when the image does not exist', async () => {
    const image = await fetchGeneratedImageById(TEST_USER_ID, 'nonexistent-id');
    expect(image).toBeUndefined();
  });
});

// ── findAlbumAvatarByAvatarId ─────────────────────────────────────────────
describe('findAlbumAvatarByAvatarId', () => {
  afterEach(() => deleteAlbums(TEST_USER_ID));

  it('returns a non-empty snapshot when the avatar exists', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    await insertAvatarIntoAlbum(album.id, TEST_USER_ID, BASE_AVATAR);

    const snapshot = await findAlbumAvatarByAvatarId(
      album.id,
      TEST_USER_ID,
      BASE_AVATAR.avatarId,
    );

    expect(snapshot.empty).toBe(false);
    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0]?.data()['avatarId']).toBe(BASE_AVATAR.avatarId);
  });

  it('returns an empty snapshot when no avatar matches the avatarId', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);

    const snapshot = await findAlbumAvatarByAvatarId(
      album.id,
      TEST_USER_ID,
      'nonexistent-avatar-id',
    );

    expect(snapshot.empty).toBe(true);
  });
});

// ── deleteAvatarFromAlbum ─────────────────────────────────────────────────
describe('deleteAvatarFromAlbum', () => {
  afterEach(() => deleteAlbums(TEST_USER_ID));

  it('removes the avatar document from the album', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    const avatarDocId = await insertAvatarIntoAlbum(
      album.id,
      TEST_USER_ID,
      BASE_AVATAR,
    );

    await deleteAvatarFromAlbum(TEST_USER_ID, album.id, avatarDocId);

    const doc = await db
      .collection('users')
      .doc(TEST_USER_ID)
      .collection('albums')
      .doc(album.id)
      .collection('avatars')
      .doc(avatarDocId)
      .get();

    expect(doc.exists).toBe(false);
  });

  it('decrements avatarCount on the album by 1', async () => {
    const album = await createAlbumDoc(TEST_USER_ID, BASE_ALBUM);
    const avatarDocId = await insertAvatarIntoAlbum(
      album.id,
      TEST_USER_ID,
      BASE_AVATAR,
    );

    await deleteAvatarFromAlbum(TEST_USER_ID, album.id, avatarDocId);

    const data = (
      await db
        .collection('users')
        .doc(TEST_USER_ID)
        .collection('albums')
        .doc(album.id)
        .get()
    ).data();

    expect(data?.['avatarCount']).toBe(0);
  });
});
