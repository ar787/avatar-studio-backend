import {
  FieldValue,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type { UserProfile } from './types.ts';

export const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore(userProfile) {
    return {
      email: userProfile.email,
      displayName: userProfile.displayName,
      isPremium: userProfile.isPremium,
      credits: userProfile.credits,
      createdAt: userProfile.createdAt || FieldValue.serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): UserProfile {
    const data = snapshot.data();
    return {
      email: data.email,
      displayName: data.displayName,
      isPremium: data.isPremium,
      credits: data.credits,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  },
};
