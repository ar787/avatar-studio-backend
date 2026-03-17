import { Router } from 'express';
import * as avatarController from './avatars.controller.ts';
import { verifyAuthTokenHandler } from '../../middlewares/verifyAuthToken.middleware.ts';

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
export default router;
