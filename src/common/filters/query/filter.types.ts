import { Document, Model, PipelineStage } from 'mongoose';

/**
 * Interface for query string parameters
 */
export interface QueryString {
  sort?: string;
  fields?: string;
  page?: string | number;
  limit?: string | number;
}

/**
 * Interface for query execution results
 */
export interface ExecuteResult<T> {
  results: T[];
  totalResults: number;
  totalPages?: number;
  limit?: number | string;
  page?: number | string;
}

/**
 * Extended query string with additional filter options
 */
export interface ExtendedQueryString extends QueryString {
  /**
   * JSON string for complex MongoDB query object
   * Allows for advanced query operations including nested logic
   */
  filter?: string;
  [key: string]: any;
}
