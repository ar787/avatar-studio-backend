import { Router } from 'express';
import multer from 'multer';
import * as avatarController from './avatars.controller.js';
import { verifyAuthTokenHandler } from '@/middlewares/verifyAuthToken.middleware.js';
const router = Router();
const upload = multer({ limits: { fileSize: 3 * 1024 * 1024 } });
router.get('/', avatarController.getAllPublicAvatars);

router.use(verifyAuthTokenHandler);
router.post('/', avatarController.generatedImages);

router.get('/library', avatarController.getGeneratedAvatars);

router.get(
  '/library/:filename/download',
  avatarController.downloadAvatarFromLibrary,
);
router.get('/:filename/download', avatarController.downloadAvatar);

router.post(
  '/save-edited',
  upload.single('file'),
  avatarController.saveEditedAvatar,
);
export default router;
