import { Router } from 'express';
import * as avatarController from './avatars.controller.ts';
import { verifyAuthTokenHandler } from '../../middlewares/verifyAuthToken.middleware.ts';

const router = Router();

router.get('/', avatarController.getAllPublicAvatarsController);
router.get('/download/:filename', avatarController.downloadAvatar);
router.get(
  '/generated-avatars',
  verifyAuthTokenHandler,
  avatarController.getGeneratedAvatarsController,
);
router.post('/generate', avatarController.generatedImagesController);
export default router;
