import { db, firestore } from '@/config/firebase.js';
import { generatedImageConverter } from '@/modules/avatars/converter.js';
import { albumAvatarConverter, albumConverter } from './converter.js';
import type { Album, AlbumAvatar, UpdateAlbumPayload } from './types.js';

export const fetchUserAlbums = async (userId: string): Promise<Album[]> => {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .withConverter(albumConverter)
    .get();

  return snapshot.docs.map((doc) => doc.data());
};

export const createAlbumDoc = async (
  userId: string,
  data: Omit<Album, 'id'>,
) => {
  const docRef = db.collection('users').doc(userId).collection('albums').doc();
  const album: Album = { id: docRef.id, ...data };
  await docRef.withConverter(albumConverter).set(album);
  return album;
};

export const fetchAlbumById = async (albumId: string, userId: string) => {
  const result = await db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId)
    .withConverter(albumConverter)
    .get();
  return result.data();
};

export const fetchAlbumAvatars = async (albumId: string, userId: string) => {
  const result = await db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId)
    .collection('avatars')
    .withConverter(albumAvatarConverter)
    .get();
  return result.docs.map((doc) => doc.data());
};

export const updateAlbumDoc = async (
  albumId: string,
  userId: string,
  payload: UpdateAlbumPayload,
) => {
  const docRef = db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId);

  await docRef.update({
    ...payload,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const deleteAlbum = async (albumId: string, userId: string) => {
  const albumRef = db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId);

  const avatarsRef = albumRef.collection('avatars');

  let snapshot = await avatarsRef.limit(450).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    snapshot = await avatarsRef.limit(450).get();
  }

  await albumRef.delete();
};

export const fetchGeneratedImageById = async (
  userId: string,
  avatarId: string,
) => {
  const result = await db
    .collection('users')
    .doc(userId)
    .collection('generated-images')
    .doc(avatarId)
    .withConverter(generatedImageConverter)
    .get();
  return result.data();
};

export const findAlbumAvatarByAvatarId = async (
  albumId: string,
  userId: string,
  avatarId: string,
) => {
  const ref = db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId)
    .collection('avatars');
  const snapshot = await ref.where('avatarId', '==', avatarId).limit(1).get();
  return snapshot;
};

export const fetchAlbumAvatarById = async (
  albumId: string,
  userId: string,
  avatarDocId: string,
): Promise<AlbumAvatar | undefined> => {
  const result = await db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId)
    .collection('avatars')
    .doc(avatarDocId)
    .withConverter(albumAvatarConverter)
    .get();
  return result.data();
};

export const deleteAvatarFromAlbum = async (
  userId: string,
  albumId: string,
  avatarId: string,
) => {
  const avatarsRef = db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId)
    .collection('avatars');

  const albumRef = db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId);

  await db.runTransaction(async (transaction) => {
    transaction.delete(avatarsRef.doc(avatarId));
    transaction.update(albumRef, {
      avatarCount: firestore.FieldValue.increment(-1),
    });
  });
};

export const insertAvatarIntoAlbum = async (
  albumId: string,
  userId: string,
  data: Omit<AlbumAvatar, 'id'>,
) => {
  const avatarsRef = db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId)
    .collection('avatars');

  const albumRef = db
    .collection('users')
    .doc(userId)
    .collection('albums')
    .doc(albumId);

  const newAvatarRef = avatarsRef.doc();

  await db.runTransaction(async (transaction) => {
    transaction.set(newAvatarRef.withConverter(albumAvatarConverter), data);
    transaction.update(albumRef, {
      avatarCount: firestore.FieldValue.increment(1),
    });
  });

  return newAvatarRef.id;
};
