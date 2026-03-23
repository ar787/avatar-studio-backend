import { Router } from 'express';
import * as userController from './user.controller.ts';
import { verifyAuthTokenHandler } from '../../middlewares/verifyAuthToken.middleware.ts';

const router = Router();

router.get(
  '/getUserProfile',
  verifyAuthTokenHandler,
  userController.getUserProfile,
);

export default router;
