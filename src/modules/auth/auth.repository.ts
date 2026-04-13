import { db } from '../../config/firebase.js';
import normalizeEmailToName from '../../utils/normalizeEmailToName.js';
import type { User } from '../users/types.js';
import { userProfileConverter } from '../users/converter.js';

export const createUserProfile = (user: User) => {
  const userRef = db
    .collection('users')
    .doc(user.uid)
    .withConverter(userProfileConverter);

  return userRef.set({
    email: user.email,
    displayName: user.displayName || normalizeEmailToName(user.email),
    emailVerified: user.emailVerified,
    picture: user.picture,
    createdAt: new Date(),
    isPremium: false,
    credits: 5,
  });
};
