import { Router } from 'express';
import * as avatarController from './avatars.controller.js';
import { verifyAuthTokenHandler } from '../../middlewares/verifyAuthToken.middleware.js';

const router = Router();

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
export default router;
