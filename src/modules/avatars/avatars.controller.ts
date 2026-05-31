import { type NextFunction, type Request, type Response } from 'express';
import * as catalogService from './service/avatar-public.service.js';
import * as avatarGeneratorService from './service/avatar-generator.service.js';
import {
  BadRequestError,
  UnauthorizedError,
} from '@/utils/errors/ApiErrors.js';
import { HttpStatusCode } from '@/utils/httpStatusCodes.js';

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
