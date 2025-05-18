import { BadRequestException, HttpException, ValidationError } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { ErrorDetail } from './error-response.interface';
import { MongooseException, ValidationException } from './app.exception';

/**
 * Extract error details from validation error
 * @param validationErrors Array of validation errors
 * @returns Array of ErrorDetail objects
 */
export function extractValidationErrors(
  validationErrors: ValidationError[],
): ErrorDetail[] {
  return validationErrors.flatMap((error) => {
    if (error.constraints) {
      return Object.values(error.constraints).map((message) => ({
        field: error.property,
        message,
        value: error.value,
      }));
    }
    if (error.children && error.children.length > 0) {
      const childErrors = extractValidationErrors(error.children);
      return childErrors.map((childError) => ({
        ...childError,
        field: `${error.property}.${childError.field}`,
      }));
    }
    return [];
  });
}

/**
 * Extract error details from Mongoose error
 * @param err Mongoose error
 * @returns Array of ErrorDetail objects
 */
export function extractMongooseErrors(err: any): ErrorDetail[] {
  // Handle Mongoose validation error
  if (err instanceof MongooseError.ValidationError) {
    return Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message,
      value: err.errors[key].value,
    }));
  }

  // Handle Mongoose duplicate key error
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    return [
      {
        field,
        message: `Duplicate value: ${value} for field ${field}`,
        value,
      },
    ];
  }

  // Handle Mongoose CastError - usually invalid ObjectId
  if (err instanceof MongooseError.CastError) {
    return [
      {
        field: err.path,
        message: `Invalid ${err.kind}: ${err.value}`,
        value: err.value,
      },
    ];
  }

  // Handle generic Mongoose errors
  return [
    {
      message: err.message || 'An unknown database error occurred',
    },
  ];
}

/**
 * Process BadRequestException for nested validation errors
 * @param exception Bad request exception
 * @returns Processed exception
 */
export function processBadRequestException(
  exception: BadRequestException,
): HttpException {
  const exceptionResponse = exception.getResponse() as any;
  
  // Check for class-validator errors with complex object structure
  if (
    exceptionResponse &&
    Array.isArray(exceptionResponse.message) &&
    exceptionResponse.message.length > 0 &&
    typeof exceptionResponse.message[0] === 'object' &&
    exceptionResponse.message[0] !== null &&
    ('property' in exceptionResponse.message[0] ||
     'constraints' in exceptionResponse.message[0])
  ) {
    const validationErrors = extractValidationErrors(exceptionResponse.message);
    return new ValidationException(validationErrors);
  }
  
  // Check for simple array of validation error messages
  if (
    exceptionResponse &&
    Array.isArray(exceptionResponse.message) &&
    exceptionResponse.message.length > 0 &&
    exceptionResponse.message.every(msg => typeof msg === 'string')
  ) {
    // Convert simple error messages to ErrorDetail objects
    const validationErrors = exceptionResponse.message.map(message => {
      // Try to extract field name from error message (e.g., "role must be a string" -> "role")
      const match = message.match(/^([a-zA-Z0-9_]+)\s+must\s+be/);
      const field = match ? match[1] : undefined;
      
      return {
        field,
        message
      };
    });
    
    return new ValidationException(validationErrors);
  }
  
  return exception;
}

/**
 * Process Mongoose error and convert it to a MongooseException
 * @param error Mongoose error
 * @returns MongooseException
 */
export function processMongooseError(error: any): MongooseException {
  const errors = extractMongooseErrors(error);
  return new MongooseException(errors);
}