import { Router } from 'express';
import multer from 'multer';
import * as userController from './user.controller.js';
import { verifyAuthTokenHandler } from '../../middlewares/verifyAuthToken.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});

const router = Router();

router.get(
  '/getUserProfile',
  verifyAuthTokenHandler,
  userController.getUserProfile,
);

router.patch(
  '/updateProfile',
  verifyAuthTokenHandler,
  userController.updateProfile,
);

router.patch(
  '/profile/image',
  verifyAuthTokenHandler,
  upload.single('picture'),
  userController.updateProfileImage,
);

export default router;
