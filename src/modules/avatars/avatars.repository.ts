import { type File } from '@google-cloud/storage';
import { db, bucket } from '../../config/firebase.ts';

export const fetchPublicAvatarsRepo = async () => {
  const snapshot = await db.collection('avatars').get();
  return snapshot.docs.map((doc) => doc.data());
};

export const fetchGeneratedAvatars = async () => {
  const snapshot = await db.collection('generated-avatars').get();
  return snapshot.docs.map((doc) => doc.data());
};

export const getFileReference = (filePath: string): File => {
  const file = bucket.file(filePath);
  return file as unknown as File;
};

export const checkFileExists = async (filePath: string) => {
  const [exist] = await bucket.file(filePath).exists();
  return exist;
};
