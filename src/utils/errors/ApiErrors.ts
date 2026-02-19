import { HttpStatusCode } from '../httpStatusCodes.ts';
import { BaseError } from './BaseError.ts';

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super('NotFoundError', HttpStatusCode.NOT_FOUND, true, message);
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
