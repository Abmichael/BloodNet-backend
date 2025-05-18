import { ErrorCategory } from './error-categories.enum';

export interface ErrorDetail {
  message: string;
  field?: string;
  value?: any;
}

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  category: ErrorCategory;
  errors: ErrorDetail[];
  stack?: string;
}