import { type NextFunction, type Request, type Response } from 'express';

import { HttpStatusCode } from '@/utils/httpStatusCodes.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '@/utils/errors/ApiErrors.js';
import capitalizeFirstLetter from '@/utils/capitalizeFirstLetter.js';
import * as albumsService from './service/albums.service.js';
import type { UpdateAlbumPayload } from './types.js';

export const getUserAlbums = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }
    const albums = await albumsService.getUserAlbums(userId);
    res.status(HttpStatusCode.OK).json({ success: true, data: albums });
  } catch (error) {
    next(error);
  }
};

export const createAlbum = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    const { name } = req.body;

    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }
    if (!name?.trim()) {
      next(new BadRequestError('Album name is required'));
      return;
    }
    const newAlbum = await albumsService.createAlbum(
      userId,
      capitalizeFirstLetter(name.trim()),
    );
    res.status(HttpStatusCode.CREATED).json({ success: true, data: newAlbum });
  } catch (error) {
    next(error);
  }
};

export const getAlbum = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    const { albumId } = req.params as { albumId: string };

    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }

    const [albumDocs, relatedAvatars] = await Promise.all([
      albumsService.getAlbumById(albumId, userId),
      albumsService.getAlbumAvatars(albumId, userId),
    ]);

    if (!albumDocs) {
      next(new NotFoundError('Album not found'));
      return;
    }

    res.status(HttpStatusCode.OK).json({
      success: true,
      data: { albumMetadata: albumDocs, avatars: relatedAvatars },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAlbum = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    const { albumId } = req.params as { albumId: string };
    const { name, description, coverImageUrl } = req.body;

    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }

    const payload: UpdateAlbumPayload = {};
    if (name !== undefined) payload.name = capitalizeFirstLetter(name.trim());
    if (description !== undefined) payload.description = description;
    if (coverImageUrl !== undefined) payload.coverImageUrl = coverImageUrl;

    const updated = await albumsService.updateAlbum(albumId, userId, payload);
    res.status(HttpStatusCode.OK).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteAlbum = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    const { albumId } = req.params as { albumId: string };

    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }

    await albumsService.deleteAlbum(albumId, userId);
    res
      .status(HttpStatusCode.OK)
      .json({ success: true, message: 'Album deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const downloadAlbumAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    const { albumId, avatarDocId } = req.params as {
      albumId: string;
      avatarDocId: string;
    };

    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }

    const { stream, filename } = await albumsService.getAlbumAvatarStream(
      albumId,
      userId,
      avatarDocId,
    );

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const deleteAlbumAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    const { albumId, avatarId } = req.params as {
      albumId: string;
      avatarId: string;
    };

    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }

    await albumsService.deleteAvatarFromAlbum(userId, albumId, avatarId);
    res.status(HttpStatusCode.OK).json({
      success: true,
      message: 'Avatar successfully deleted from album',
    });
  } catch (error) {
    next(error);
  }
};

export const addAvatarToAlbum = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    const { albumId } = req.params as { albumId: string };
    const { avatarId } = req.body;

    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }
    if (!avatarId) {
      next(new BadRequestError('Avatar id is required'));
      return;
    }

    const result = await albumsService.addToAlbum(albumId, userId, avatarId);

    res.status(HttpStatusCode.CREATED).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
