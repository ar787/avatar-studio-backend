import { type File } from '@google-cloud/storage';
import { db, bucket } from '../../config/firebase.js';
import { generatedImageConverter } from './converter.js';
import type { GeneratedImage } from './types.js';
import { getDownloadURL } from 'firebase-admin/storage';

export const fetchPublicAvatarsRepo = async () => {
  const snapshot = await db.collection('avatars').get();
  return snapshot.docs.map((doc) => doc.data());
};

export const fetchGeneratedAvatars = async (userId: string) => {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('generated-images')
    .orderBy('createdAt', 'desc')
    .withConverter(generatedImageConverter)
    .get();

  return snapshot.docs.map((doc) => {
    const { storagePath, ...rest } = doc.data();
    const storagePathArr = storagePath.split('/');
    const name = storagePathArr[storagePathArr.length - 1];

    return {
      ...rest,
      name,
    };
  });
};

export const getFileReference = (filePath: string): File => {
  const file = bucket.file(filePath);
  return file as unknown as File;
};

export const getSignedUrl = async (file: File) => {
  return await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });
};

export const checkFileExists = async (filePath: string) => {
  const [exist] = await bucket.file(filePath).exists();
  return exist;
};

export const addImageToLibrary = async (
  userId: string,
  doc: GeneratedImage,
) => {
  const userImagesRef = db
    .collection('users')
    .doc(userId)
    .collection('generated-images');

  const docRef = await userImagesRef.add({ ...doc });

  return docRef.id;
};
