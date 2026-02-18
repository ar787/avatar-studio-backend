import { Router } from 'express';
import * as avatarController from './avatars.controller.ts';

const router = Router();

router.get('/', avatarController.getAllPublicAvatarsController);
router.get('/download/:filename', avatarController.downloadAvatar);
router.get('/generate', avatarController.generatedImagesController);
export default router;
