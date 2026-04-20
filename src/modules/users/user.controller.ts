import { type NextFunction, type Request, type Response } from 'express';
import * as userService from './service/user.service.js';
import { HttpStatusCode } from '../../utils/httpStatusCodes.js';
import type { UserProfile } from './types.js';
import {
  BadRequestError,
  UnauthorizedError,
} from '../../utils/errors/ApiErrors.js';

export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid!;
    const result = await userService.getUserProfile(userId);

    res.status(HttpStatusCode.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.uid;

  if (!userId) {
    throw new UnauthorizedError('User ID not found in request');
  }

  const { displayName } = req.body as UserProfile;

  try {
    const result = await userService.renameUser(userId, displayName);
    res.status(HttpStatusCode.OK).json({
      success: true,
      data: result,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfileImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.uid;
  const file = req.file;

  if (!userId) {
    throw new UnauthorizedError('User ID not found in request');
  }

  if (!file) {
    throw new BadRequestError('No file uploaded');
  }

  try {
    const { message, picture } = await userService.uploadAvatar(userId, file);
    res.status(HttpStatusCode.OK).json({ success: true, message, picture });
  } catch (error) {
    next(error);
  }
};
