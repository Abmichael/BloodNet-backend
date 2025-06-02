import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { MongooseException } from './app.exception';
import { extractMongooseErrors } from './exceptions';

/**
 * Interceptor to automatically catch and process Mongoose errors.
 *
 * This eliminates the need to wrap Mongoose operations in try/catch blocks.
 * Simply use this interceptor globally, and all Mongoose errors will be
 * transformed into MongooseException instances with structured error details.
 */
@Injectable()
export class MongooseErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Check if it's a Mongoose error
        if (
          error.name === 'ValidationError' ||
          error.name === 'CastError' ||
          error.name === 'MongoServerError' ||
          error.name?.includes('Mongo') ||
          error.code === 11000
        ) {
          // Extract error details and throw a MongooseException
          const errors = extractMongooseErrors(error);
          return throwError(() => new MongooseException(errors));
        }

        // If not a Mongoose error, pass it through
        return throwError(() => error);
      }),
    );
  }
}
