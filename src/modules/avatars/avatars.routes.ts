import { Router } from 'express';
import multer from 'multer';
import * as avatarController from './avatars.controller.js';
import { verifyAuthTokenHandler } from '@/middlewares/verifyAuthToken.middleware.js';
const router = Router();
const upload = multer();
router.get('/', avatarController.getAllPublicAvatarsController);
router.get('/download/:filename', avatarController.downloadAvatar);
// Deprecated
router.get(
  '/generated-avatars',
  verifyAuthTokenHandler,
  avatarController.getGeneratedAvatarsController,
);
router.post(
  '/generate',
  verifyAuthTokenHandler,
  avatarController.generatedImagesController,
);

router.get(
  '/download-from-library/:filename',
  verifyAuthTokenHandler,
  avatarController.downloadAvatarFromLibrary,
);

router.post(
  '/save-edited',
  verifyAuthTokenHandler,
  upload.single('file'),
  avatarController.saveEditedAvatar,
);
export default router;
