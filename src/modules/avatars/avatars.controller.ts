import { type NextFunction, type Request, type Response } from 'express';
import * as catalogService from './service/avatar-public.service.js';
import * as avatarGeneratorService from './service/avatar-generator.service.js';
import * as albumsService from '@/modules/albums/service/albums.service.js';
import {
  BadRequestError,
  UnauthorizedError,
} from '@/utils/errors/ApiErrors.js';
import { HttpStatusCode } from '@/utils/httpStatusCodes.js';
import type { PresetType } from './types.js';

export const getAllPublicAvatarsController = async (
  _: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const avatars = await catalogService.getAllPublicCatalog();
    res.status(HttpStatusCode.OK).json({
      success: true,
      data: avatars,
    });
  } catch (error) {
    next(error);
  }
};

export const getGeneratedAvatarsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError('User not authorized'));
    }
    const generatedAvatars = await avatarGeneratorService.getGeneratedAvatars(
      user.uid,
    );
    res.status(HttpStatusCode.OK).json({
      success: true,
      data: generatedAvatars,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadAvatarFromLibrary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filename = req.params.filename;
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestError('Filename is required');
    }
    const userId = req.user?.uid;
    if (!userId) {
      next(new UnauthorizedError('User not authorized'));
      return;
    }
    const stream = await avatarGeneratorService.getAvatarStream(
      userId,
      filename,
    );

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const downloadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filename = req.params.filename;
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestError('Filename is required');
    }

    const stream = await catalogService.getAvatarStream(filename);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const generatedImagesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError('Unauthorized user'));
    }
    const result = await avatarGeneratorService.generateImages(
      req.body.prompt,
      user.uid,
      req.body.style,
    );
    res.status(HttpStatusCode.OK).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const saveEditedAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid;
    const file = req.file;
    const { avatarId } = req.body;
    const albumId: string | undefined =
      req.body.albumId && req.body.albumId !== 'undefined'
        ? req.body.albumId
        : undefined;
    const preset: PresetType | undefined =
      req.body.preset && req.body.preset !== 'undefined'
        ? req.body.preset
        : undefined;
    const adjustments: Record<string, number> | undefined = req.body.adjustments
      ? JSON.parse(req.body.adjustments)
      : undefined;

    if (!userId) {
      throw new UnauthorizedError('User ID not found in request');
    }

    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    if (!avatarId) {
      throw new BadRequestError('avatarId is required');
    }

    const { avatar: newAvatar, remainingCredits } =
      await avatarGeneratorService.uploadEditedAvatar(
        userId,
        avatarId,
        file,
        adjustments,
        preset,
      );
    if (albumId) {
      await albumsService.addUploadedAvatarToAlbum(albumId, userId, newAvatar);
    }

    res.status(HttpStatusCode.CREATED).json({
      success: true,
      data: { avatar: newAvatar, remainingCredits },
    });
  } catch (error) {
    next(error);
  }
};
