import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorDetail } from '../error-response.interface';
import { ErrorCategory } from './error-categories.enum';

export class AppException extends HttpException {
  constructor(
    public readonly errors: ErrorDetail[],
    public readonly statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly category: ErrorCategory = ErrorCategory.UNKNOWN,
  ) {
    super({ errors, statusCode, category }, statusCode);
  }
}

export class ApiException extends AppException {
  constructor(
    errors: ErrorDetail[] | string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    const errorDetails = Array.isArray(errors)
      ? errors
      : [{ message: errors }];
    super(errorDetails, statusCode, ErrorCategory.API);
  }
}

export class DatabaseException extends AppException {
  constructor(
    errors: ErrorDetail[] | string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    const errorDetails = Array.isArray(errors)
      ? errors
      : [{ message: errors }];
    super(errorDetails, statusCode, ErrorCategory.DATABASE);
  }
}

export class ValidationException extends AppException {
  constructor(
    errors: ErrorDetail[] | string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    const errorDetails = Array.isArray(errors)
      ? errors
      : [{ message: errors }];
    super(errorDetails, statusCode, ErrorCategory.VALIDATION);
  }
}

export class AuthenticationException extends AppException {
  constructor(
    errors: ErrorDetail[] | string,
    statusCode: HttpStatus = HttpStatus.UNAUTHORIZED,
  ) {
    const errorDetails = Array.isArray(errors)
      ? errors
      : [{ message: errors }];
    super(errorDetails, statusCode, ErrorCategory.AUTHENTICATION);
  }
}

export class AuthorizationException extends AppException {
  constructor(
    errors: ErrorDetail[] | string,
    statusCode: HttpStatus = HttpStatus.FORBIDDEN,
  ) {
    const errorDetails = Array.isArray(errors)
      ? errors
      : [{ message: errors }];
    super(errorDetails, statusCode, ErrorCategory.AUTHORIZATION);
  }
}

export class MongooseException extends AppException {
  constructor(
    errors: ErrorDetail[] | string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    const errorDetails = Array.isArray(errors)
      ? errors
      : [{ message: errors }];
    super(errorDetails, statusCode, ErrorCategory.MONGOOSE);
  }
}