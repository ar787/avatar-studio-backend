import { Router } from 'express';
import * as avatarController from './avatars.controller.ts';

const router = Router();

router.get('/', avatarController.getAllPublicAvatarsController);

export default router;
