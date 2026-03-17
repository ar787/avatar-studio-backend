import { Router } from 'express';
import * as authController from './auth.controller.ts';
import { verifyAuthTokenHandler } from '../../middlewares/verifyAuthToken.middleware.ts';

const router = Router();

router.post(
  '/createUserDocument',
  verifyAuthTokenHandler,
  authController.createUserDocument,
);

export default router;
