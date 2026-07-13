import { type File } from '@google-cloud/storage';
import { db, bucket } from '@/config/firebase.js';
import { generatedImageConverter } from './converter.js';
import type { GeneratedImage } from './types.js';
import config from '@/config/config.js';

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
      id: doc.id,
      ...rest,
      name,
    };
  });
};

export const getFileReference = (filePath: string): File => {
  const file = bucket.file(filePath);
  return file as unknown as File;
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

  const docRef = await userImagesRef.add(doc);

  return docRef.id;
};

export const getPermanentUrl = (
  bucketName: string,
  encodedPath: string,
  downloadToken: string,
) => {
  return `${config.storageBaseUrl}/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
};

export const uploadImage = async (
  storagePath: string,
  file: Express.Multer.File,
  downloadToken: string,
) => {
  const fileUpload = bucket.file(storagePath);

  await fileUpload.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });
};

export const getAvatarById = async (avatarId: string, userId: string) => {
  const res = await db
    .collection('users')
    .doc(userId)
    .collection('generated-images')
    .doc(avatarId)
    .withConverter(generatedImageConverter)
    .get();
  return res.data();
};
