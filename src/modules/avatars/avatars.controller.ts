import { type Request, type Response } from 'express';
import * as catalogService from './service/public-catalog.service.ts';
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
