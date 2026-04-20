import { v4 as uuidv4 } from 'uuid';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../utils/errors/ApiErrors.js';

import * as usersRepository from '../user.repository.js';
import config from '../../../config/config.js';

export const getUserProfile = async (userId: string) => {
  const doc = await usersRepository.getUserProfileData(userId);

  if (!usersRepository.checkIsDocExists(doc)) {
    throw new NotFoundError('User profile not found in database');
  }

  return doc.data();
};

export const renameUser = (userId: string, newDisplayName: string) => {
  return usersRepository.updateUserProfile(userId, {
    displayName: newDisplayName,
  });
};

export const uploadAvatar = async (
  userId: string,
  file: Express.Multer.File,
) => {
  const downloadToken = uuidv4();
  const storagePath = `users/${userId}/profile-pictures/${file.fieldname}`;

  await usersRepository.uploadImage(storagePath, file, downloadToken);

  const bucketName = config.firebaseStorageBucket;
  const encodedPath = encodeURIComponent(storagePath);
  const permanentUrl = `${config.storageBaseUrl}/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  await usersRepository.updateUserProfile(userId, {
    picture: permanentUrl,
  });

  return {
    picture: permanentUrl,
    message: 'Profile picture has successfully uploaded and updated',
  };
};

export const deductCredits = (userId: string, amount: number) => {
  return usersRepository.runUpdateCreditTransaction(
    userId,
    (currentCredits) => {
      if (currentCredits < amount) {
        throw new ForbiddenError('Insufficient credits.');
      }

      return currentCredits - amount;
    },
  );
};

export const addCredits = async (userId: string, amount: number) => {
  return await usersRepository.incrementCredits(userId, amount);
};
