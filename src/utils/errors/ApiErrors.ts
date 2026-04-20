import { HttpStatusCode } from '../httpStatusCodes.js';
import { BaseError } from './BaseError.js';

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super('NotFoundError', HttpStatusCode.NOT_FOUND, true, message);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super('ForbiddenError', HttpStatusCode.FORBIDDEN, true, message);
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string) {
    super('BadRequestError', HttpStatusCode.BAD_REQUEST, true, message);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized access') {
    super('UnauthorizedError', HttpStatusCode.UNAUTHORIZED, true, message);
  }
}

export class FileTooLargeError extends BaseError {
  constructor(message: string = 'File is to large') {
    super('FileTooLargeError', HttpStatusCode.CONTENT_TO_LARGE, true, message);
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal Server Error') {
    super(
      'InternalServerError',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      false,
      message,
    );
  }
}
