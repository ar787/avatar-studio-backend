import { FieldValue } from 'firebase-admin/firestore';

export type GeneratedImage = {
  url: string;
  prompt: string;
  storagePath: string;
  extension: 'png';
  createdAt: Date | FieldValue;
};
