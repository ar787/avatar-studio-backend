import { Router } from 'express';
import multer from 'multer';
import * as userController from './user.controller.js';
import { verifyAuthTokenHandler } from '@/middlewares/verifyAuthToken.middleware.js';
import { BadRequestError } from '@/utils/errors/ApiErrors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter(_, file, callback) {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
    } else {
      callback(new BadRequestError('Only images are allowed!'));
    }
  },
});

const router = Router();
router.use(verifyAuthTokenHandler);
router
  .get('/profile', userController.getUserProfile)
  .patch('/profile', userController.updateProfile);

router.patch(
  '/profile/image',
  upload.single('picture'),
  userController.updateProfileImage,
);

export default router;
