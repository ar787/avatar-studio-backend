import { Router } from 'express';
import * as userController from './user.controller.js';
import { verifyAuthTokenHandler } from '../../middlewares/verifyAuthToken.middleware.js';

const router = Router();

router.get(
  '/getUserProfile',
  verifyAuthTokenHandler,
  userController.getUserProfile,
);

export default router;
