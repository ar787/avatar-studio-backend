import type { Request, Response, NextFunction } from 'express';
import { BaseError } from '../utils/errors/BaseError.js';
import { HttpStatusCode } from '../utils/httpStatusCodes.js';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error instanceof BaseError && error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      status: error.name,
      message: error.message,
    });
  }

  console.error(' [FATAL ERROR] 💣 ', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });

  return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
    success: false,
    status: 'InternalServerError',
    message: 'Internal server error',
  });
};
