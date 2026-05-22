import { Router } from 'express';
import * as albumsController from './albums.controller.js';
import { verifyAuthTokenHandler } from '@/middlewares/verifyAuthToken.middleware.js';

const router = Router();
router.use(verifyAuthTokenHandler);

router
  .get('/', albumsController.getUserAlbums)
  .post('/', albumsController.createAlbum);

router
  .get('/:albumId', albumsController.getAlbum)
  .patch('/:albumId', albumsController.updateAlbum)
  .delete('/:albumId', albumsController.deleteAlbum);

router
  .post('/:albumId/avatars', albumsController.addAvatarToAlbum)
  .get(
    '/:albumId/avatars/:avatarDocId/download',
    albumsController.downloadAlbumAvatar,
  );

router.delete(
  '/:albumId/avatars/:avatarId',
  albumsController.deleteAlbumAvatar,
);

export default router;
