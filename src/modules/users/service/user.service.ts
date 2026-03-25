import {
  ForbiddenError,
  NotFoundError,
} from '../../../utils/errors/ApiErrors.js';
import * as usersRepository from '../user.repository.js';

export const getUserProfile = async (userId: string) => {
  const doc = await usersRepository.getUserProfileData(userId);

  if (!usersRepository.checkIsDocExists(doc)) {
    throw new NotFoundError('User profile not found in database');
  }

  return doc.data();
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
