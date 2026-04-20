import type { Request, Response, NextFunction } from 'express';
import { BaseError } from '../utils/errors/BaseError.js';
import { HttpStatusCode } from '../utils/httpStatusCodes.js';
import { FileTooLargeError } from '../utils/errors/ApiErrors.js';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    error = new FileTooLargeError('File is too large. Maximum size is 3MB.');
  }

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
