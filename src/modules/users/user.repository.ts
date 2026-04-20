import { bucket, db, firestore } from '../../config/firebase.js';
import { NotFoundError } from '../../utils/errors/ApiErrors.js';
import { userProfileConverter } from './converter.js';
import type { UserProfile } from './types.js';

export const getUserProfileData = async (userId: string) => {
  return await db
    .collection('users')
    .doc(userId)
    .withConverter(userProfileConverter)
    .get();
};

export const updateUserProfile = async (
  userId: string,
  userProfile: Partial<UserProfile>,
) => {
  const userRef = db
    .collection('users')
    .doc(userId)
    .withConverter(userProfileConverter);

  return await userRef.update({
    ...userProfile,
  });
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

export const checkIsDocExists = (doc: FirebaseFirestore.DocumentSnapshot) => {
  return doc.exists;
};

export const getUserRef = (userId: string) => {
  return db.collection('users').doc(userId);
};

export const runUpdateCreditTransaction = (
  userId: string,
  updateFn: (currentCredits: number) => number,
) => {
  const userRef = getUserRef(userId);

  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new NotFoundError('User profile not found.');
    }

    const currentCredits = userDoc.data()?.credits ?? 0;
    const newCredits = updateFn(currentCredits);

    transaction.update(userRef, {
      credits: newCredits,
    });

    return newCredits;
  });
};

export const incrementCredits = async (userId: string, amount: number) => {
  return await getUserRef(userId).update({
    credits: firestore.FieldValue.increment(amount),
  });
};
