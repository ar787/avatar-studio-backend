import type { User } from '../../users/types.js';
import * as authRepository from './../auth.repository.js';

export const initializeUser = async (user: User) => {
  await authRepository.createUserProfile(user);
  return { message: 'User profile initialized' };
};
