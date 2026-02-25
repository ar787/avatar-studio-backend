import { type NextFunction, type Request, type Response } from 'express';
import * as catalogService from './service/avatar-public.service.ts';
import * as avatarGeneratorService from './service/avatar-generator.service.ts';
import { BadRequestError } from '../../utils/errors/ApiErrors.ts';
import { HttpStatusCode } from '../../utils/httpStatusCodes.ts';

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
  } catch (error: any) {
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
  } catch (error: any) {
    next(error);
  }
};

export const generatedImagesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await avatarGeneratorService.generateImages(req.body.prompt);
    res.status(HttpStatusCode.OK).json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
};
