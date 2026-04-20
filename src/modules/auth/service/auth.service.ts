import type { User } from '@/modules/users/types.js';
import * as authRepository from '../auth.repository.js';

export const initializeUser = async (user: User) => {
  const isUserExist = await authRepository.findByUserId(user.uid);
  if (isUserExist) {
    return { isNew: false };
  }
  await authRepository.createUserProfile(user);
  return { isNew: true };
};
