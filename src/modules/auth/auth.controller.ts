import { type NextFunction, type Request, type Response } from 'express';
import * as authService from './service/auth.service.js';
import { HttpStatusCode } from '../../utils/httpStatusCodes.js';
import { UnauthorizedError } from '../../utils/errors/ApiErrors.js';

export const createUserDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError('User not authorized'));
    }
    const { uid, email, name } = user;
    await authService.initializeUser({
      uid,
      email,
      displayName: name,
    });

    res.status(HttpStatusCode.CREATED).json({
      success: true,
      message: 'Profile ready',
    });
  } catch (error) {
    next(error);
  }
};
