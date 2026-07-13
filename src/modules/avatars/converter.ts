import {
  FieldValue,
  QueryDocumentSnapshot,
  type FirestoreDataConverter,
} from 'firebase-admin/firestore';
import type { GeneratedImage } from './types.ts';

export const generatedImageConverter: FirestoreDataConverter<GeneratedImage> = {
  toFirestore(image: GeneratedImage): FirebaseFirestore.DocumentData {
    return {
      url: image.url,
      prompt: image.prompt,
      extension: image.extension,
      storagePath: image.storagePath,
      createdAt: image.createdAt || FieldValue.serverTimestamp(),
      ...(image.adjustments !== undefined && {
        adjustments: image.adjustments,
      }),
      ...(image.preset !== undefined && { preset: image.preset }),
    };
  },

  fromFirestore(snapshot: QueryDocumentSnapshot): GeneratedImage {
    const data = snapshot.data();
    return {
      url: data.url,
      prompt: data.prompt,
      extension: data.extension,
      storagePath: data.storagePath,
      createdAt: data.createdAt?.toDate() || new Date(),
      ...(data.adjustments !== undefined && { adjustments: data.adjustments }),
      ...(data.preset !== undefined && { preset: data.preset }),
    };
  },
};
