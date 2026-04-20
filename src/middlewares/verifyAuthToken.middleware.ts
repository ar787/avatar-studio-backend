import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { UnauthorizedError } from '@/utils/errors/ApiErrors.js';
import { firebaseTokenErrorMapper } from '@/utils/firebaseTokenErrorMapper.js';

export const verifyAuthTokenHandler = async (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next(new UnauthorizedError('Missing authorization header'));
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    next(
      new UnauthorizedError(
        'Invalid authorization format. Use: Bearer <token>',
      ),
    );
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken || idToken.trim() === '') {
    next(new UnauthorizedError('Token is undefined or empty'));
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? '',
      emailVerified: decodedToken.email_verified ?? false,
      displayName: decodedToken.name ?? '',
      picture: decodedToken.picture ?? '',
    };

    next();
  } catch (error) {
    const message = firebaseTokenErrorMapper(error);
    next(new UnauthorizedError(message));
  }
};
