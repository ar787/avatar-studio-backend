import {
  FieldValue,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type { UserProfile } from './types.js';

export const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore(userProfile) {
    return {
      email: userProfile.email,
      displayName: userProfile.displayName,
      picture: userProfile.picture,
      isPremium: userProfile.isPremium,
      credits: userProfile.credits,
      emailVerified: userProfile.emailVerified,
      createdAt: userProfile.createdAt || FieldValue.serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): UserProfile {
    const data = snapshot.data();
    return {
      email: data.email,
      displayName: data.displayName,
      picture: data.picture,
      isPremium: data.isPremium,
      emailVerified: data.emailVerified,
      credits: data.credits,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  },
};
