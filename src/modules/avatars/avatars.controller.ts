import { type Request, type Response } from 'express';
import * as catalogService from './service/public-catalog.service.ts';

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
