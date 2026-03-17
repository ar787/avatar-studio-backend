import {
  FieldValue,
  QueryDocumentSnapshot,
  type FirestoreDataConverter,
} from 'firebase-admin/firestore';
import type { GeneratedImage } from './types.ts';

export const generatedImageConverter: FirestoreDataConverter<GeneratedImage> = {
  // Logic to prepare data for storage in Firestore
  toFirestore(image: GeneratedImage): FirebaseFirestore.DocumentData {
    return {
      url: image.url,
      prompt: image.prompt,
      extension: image.extension,
      storagePath: image.storagePath,
      createdAt: image.createdAt || FieldValue.serverTimestamp(),
    };
  },

  // Logic to transform data coming out of Firestore
  fromFirestore(snapshot: QueryDocumentSnapshot): GeneratedImage {
    const data = snapshot.data();
    return {
      url: data.url,
      prompt: data.prompt,
      extension: data.extension,
      storagePath: data.storagePath,
      // Automatically convert Firestore Timestamp to JS Date
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  },
};
