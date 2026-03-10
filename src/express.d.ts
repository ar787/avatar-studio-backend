import type { Request } from 'express';
import admin from 'firebase-admin';

interface AuthenticatedUser {
  uid: string;
  name?: string | undefined;
  email?: string | undefined;
  emailVerified?: boolean | undefined;
  picture?: string | undefined;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
