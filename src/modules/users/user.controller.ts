import { type NextFunction, type Request, type Response } from 'express';
import * as userService from './service/user.service.ts';
import { HttpStatusCode } from '../../utils/httpStatusCodes.ts';

export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.uid!;
    const result = await userService.getUserProfile(userId);

    res.status(HttpStatusCode.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
