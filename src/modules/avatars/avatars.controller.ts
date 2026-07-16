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
import { parseAdjustments, VALID_PRESETS } from './avatars.utils.js';

export const getAllPublicAvatars = async (
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

export const getGeneratedAvatars = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedError('User not authorized');
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
      throw new UnauthorizedError('User not authorized');
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

export const generatedImages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError('Unauthorized user'));
    }
    if (!req.body.prompt?.trim()) {
      throw new BadRequestError('prompt is required');
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
      req.body.preset &&
      req.body.preset !== 'undefined' &&
      VALID_PRESETS.has(req.body.preset)
        ? (req.body.preset as PresetType)
        : undefined;
    const adjustments: Record<string, number> | undefined = req.body.adjustments
      ? parseAdjustments(req.body.adjustments)
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
