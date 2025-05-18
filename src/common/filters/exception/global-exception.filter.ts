import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { AppException } from './app.exception';
import { ErrorCategory } from './error-categories.enum';
import { ErrorDetail, ErrorResponse } from './error-response.interface';
import {
  processBadRequestException,
  processMongooseError,
} from './exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.url;

    let statusCode: number;
    let errorResponse: ErrorResponse;

    // Step 1: Process the exception through the pipeline
    const processedException = this.processException(exception);    // Step 2: Extract status code and create response
    if (processedException instanceof AppException) {
      // Our custom exception
      statusCode = processedException.statusCode;
      errorResponse = this.createErrorResponse(
        statusCode,
        path,
        processedException.category,
        processedException.errors,
        exception,
      );
    } else if (processedException instanceof HttpException) {
      // NestJS HTTP exception
      statusCode = processedException.getStatus();
      const exceptionResponse = processedException.getResponse();
      const errors: ErrorDetail[] = this.extractHttpExceptionErrors(exceptionResponse);
      
      // Determine the category - if it's validation-related, use VALIDATION category
      const category = this.isValidationError(exceptionResponse) 
        ? ErrorCategory.VALIDATION 
        : ErrorCategory.API;
      
      errorResponse = this.createErrorResponse(
        statusCode,
        path,
        category,
        errors,
        exception,
      );
    } else {
      // Unknown exception
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = this.createErrorResponse(
        statusCode,
        path,
        ErrorCategory.UNKNOWN,
        [{ message: 'Internal server error' }],
        exception,
      );
    }

    // Step 3: Log the error
    this.logError(errorResponse, exception);

    // Step 4: Send response
    response.status(statusCode).json(errorResponse);
  }

  private processException(exception: unknown): unknown {
    if (exception instanceof HttpException) {
      // Process BadRequestException which might contain validation errors
      if (exception.name === 'BadRequestException') {
        return processBadRequestException(exception);
      }
      return exception;
    }

    // Process Mongoose errors
    if (
      exception instanceof MongooseError ||
      (exception as any).name?.includes('Mongo') ||
      (exception as any).code === 11000
    ) {
      return processMongooseError(exception);
    }

    return exception;
  }
  private extractHttpExceptionErrors(exceptionResponse: any): ErrorDetail[] {
    if (typeof exceptionResponse === 'string') {
      return [{ message: exceptionResponse }];
    }

    if (typeof exceptionResponse === 'object') {
      const message = exceptionResponse.message || exceptionResponse.error;
      
      if (Array.isArray(message)) {
        return message.map((msg) => {
          if (typeof msg === 'string') {
            // Try to extract field name from error message (e.g., "role must be a string" -> "role")
            const match = msg.match(/^([a-zA-Z0-9_]+)\s+must\s+be/);
            const field = match ? match[1] : undefined;
            
            return { message: msg, field };
          }
          return msg;
        });
      }
      
      if (typeof message === 'string') {
        return [{ message }];
      }
    }

    return [{ message: 'Unknown error' }];
  }

  private createErrorResponse(
    statusCode: number,
    path: string,
    category: ErrorCategory,
    errors: ErrorDetail[],
    exception: unknown,
  ): ErrorResponse {
    const response: ErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      path,
      category,
      errors: errors.length ? errors : [{ message: 'Unknown error' }],
    };

    // Add stack trace in development mode
    if (process.env.NODE_ENV === 'development') {
      response.stack = exception instanceof Error 
        ? exception.stack 
        : String(exception);
    }

    return response;
  }
  private isValidationError(exceptionResponse: any): boolean {
    // Check if it's a class-validator validation error with complex structure
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      Array.isArray(exceptionResponse.message)
    ) {
      // Class-validator errors are objects with constraints
      if (exceptionResponse.message.some(
        (item: any) =>
          typeof item === 'object' &&
          item !== null &&
          ('constraints' in item || 'children' in item || 'property' in item)
      )) {
        return true;
      }
      
      // Simple validation errors (array of strings with validation messages)
      if (exceptionResponse.message.length > 0 && 
          exceptionResponse.message.every((msg: any) => typeof msg === 'string')) {
        const validationTerms = [
          'must be', 'should be', 'is required', 'cannot be', 
          'invalid', 'not a valid', 'minimum', 'maximum', 'shorter', 'longer'
        ];
        
        return exceptionResponse.message.some((msg: string) => 
          validationTerms.some(term => msg.includes(term))
        );
      }
    }
    
    // Check for simple validation messages that include common validation terms
    if (
      exceptionResponse && 
      typeof exceptionResponse === 'object' && 
      typeof exceptionResponse.message === 'string'
    ) {
      const validationTerms = [
        'validation', 
        'valid', 
        'invalid', 
        'required', 
        'must be'
      ];
      
      return validationTerms.some(term => 
        exceptionResponse.message.toLowerCase().includes(term)
      );
    }
    
    return false;
  }

  private logError(errorResponse: ErrorResponse, exception: unknown): void {
    const { statusCode, path, category, errors } = errorResponse;
    const messages = errors.map(err => err.message).join(', ');
    
    this.logger.error(
      `[${category}] Status ${statusCode} - ${messages} - Path: ${path}`,
      exception instanceof Error ? exception.stack : undefined,
    );
  }
}