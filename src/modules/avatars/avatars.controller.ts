import { type Request, type Response } from 'express';
import * as catalogService from './service/avatar-public.service.ts';
import * as avatarGeneratorService from './service/avatar-generator.service.ts';

export const getAllPublicAvatarsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const avatars = await catalogService.getAllPublicCatalog();
    res.status(200).json({
      success: true,
      data: avatars,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const downloadAvatar = async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;

    if (!filename || typeof filename !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'ID is required' });
    }

    const stream = await catalogService.getAvatarStream(filename);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.pipe(res);
  } catch (error: any) {
    if (error.message === 'image not found') {
      return res.status(404).json({
        success: false,
        message: 'The avatar file was not found in our storage.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Something went wrong.',
    });
  }
};

export const generatedImagesController = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await avatarGeneratorService.generateImages();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
