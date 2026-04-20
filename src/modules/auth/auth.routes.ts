import { Router } from 'express';
import * as authController from './auth.controller.js';
import { verifyAuthTokenHandler } from '@/middlewares/verifyAuthToken.middleware.js';

const router = Router();

router.post(
  '/createUserDocument',
  verifyAuthTokenHandler,
  authController.createUserDocument,
);

export default router;
