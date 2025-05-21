import { Model, PipelineStage } from 'mongoose';
import * as mongoose from 'mongoose';
import { ExecuteResult, ExtendedQueryString } from './filter.types';

/**
 * Class for applying filters, sorting, and pagination to MongoDB aggregation pipelines.
 * Use this when you need to work with aggregation pipelines instead of simple queries.
 *
 * @example
 * // In your controller
 * @Get()
 * async findAll(@Query() query: ExtendedQueryString) {
 *   const aggregation = new AggregationFilter(
 *     this.donorModel,
 *     [{$lookup: {from: 'users', localField: 'user', foreignField: '_id', as: 'user'}}],
 *     query
 *   );
 *
 *   return await aggregation
 *     .filter()
 *     .sort()
 *     .limitFields()
 *     .paginate()
 *     .execute();
 * }
 */
export class AggregationFilter<T> {
  private model: Model<T>;
  private query: any[];
  private queryString: ExtendedQueryString;
  private totalResults: number;
  private totalPages: number;
  private result: T[];

  /**
   * Create a new AggregationFilter instance
   * @param model Mongoose model
   * @param query Initial aggregation pipeline
   * @param queryString Query parameters
   */
  constructor(model: Model<T>, query: any[], queryString: ExtendedQueryString) {
    this.model = model;
    this.query = query;
    this.queryString = queryString;
    this.totalResults = 0;
    this.totalPages = 0;
    this.result = [];
  }

  /**
   * Sort the results based on the sort parameter
   * Format: field:asc,field2:desc or just field (defaults to asc)
   */
  sort(): this {
    const sortBy = this.queryString.sort;
    if (sortBy) {
      const sortObj: Record<string, 1 | -1> = {};
      sortBy.split(',').forEach((sortField) => {
        const [field, order] = sortField.trim().split(':');
        sortObj[`${field}`] = order === 'desc' ? -1 : 1;
      });
      this.query.push({ $sort: sortObj });
    } else {
      this.query.push({ $sort: { createdAt: -1 } });
    }
    return this;
  }
  /**
   * Apply filters to the aggregation pipeline
   * Supports only simple field-based filtering with operators.
   * Advanced filtering via raw JSON is disabled for security reasons.
   */
  filter(): this {
    const queryObject = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'filter'];
    excludedFields.forEach((el) => delete queryObject[el]);

    // Advanced filtering via raw JSON is disabled for security reasons.
    // if (this.queryString.filter) { ... }

    const operators = ['gte', 'gt', 'lte', 'lt', 'eq', 'regex', 'regex^', 'ne'];
    const matchObj: any = {};

    Object.keys(queryObject).forEach((key) => {
      const [field, operator] = key.split('[');
      if (operator && operators.includes(operator.slice(0, -1))) {
        if (!matchObj[field]) {
          matchObj[field] = {};
        }
        if (operator.slice(0, -1) === 'regex') {
          // Only allow safe regex patterns (alphanumeric and spaces, no special chars)
          const safePattern = String(queryObject[key]).replace(/[^a-zA-Z0-9 ]/g, '');
          matchObj[field][`$${operator.slice(0, -1)}`] = new RegExp(
            `${safePattern}`,
            'i',
          );
        } else if (operator.slice(0, -1) === 'regex^') {
          const safePattern = String(queryObject[key]).replace(/[^a-zA-Z0-9 ]/g, '');
          matchObj[field][`$regex`] = new RegExp(
            `^${safePattern}`,
            'i',
          );
        } else {
          matchObj[field][`$${operator.slice(0, -1)}`] = queryObject[key];
        }
      } else {
        if (
          typeof queryObject[key] === 'string' &&
          /^[0-9a-fA-F]{24}$/.test(queryObject[key])
        ) {
          matchObj[key] = new mongoose.Types.ObjectId(queryObject[key]);
        } else {
          matchObj[key] = queryObject[key];
        }
      }
    });

    // Add the $match stage to the pipeline
    this.query.unshift({ $match: matchObj });
    return this;
  }

  /**
   * Limit the fields returned in the results
   * Format: field1,field2,field3
   */
  limitFields(): this {
    const selectedFields = this.queryString.fields;
    if (selectedFields) {
      const fieldsArray = selectedFields
        .split(',')
        .reduce<Record<string, 1>>((acc, field) => {
          acc[field] = 1;
          return acc;
        }, {});
      this.query.push({ $project: fieldsArray });
    } else {
      this.query.push({ $project: { __v: 0 } }); // Exclude __v by default
    }
    return this;
  }

  /**
   * Paginate the results
   */
  paginate(): this {
    if (this.queryString.page || this.queryString.limit) {
      const page = Number(this.queryString.page) || 1;
      const limit = Number(this.queryString.limit) || 10;

      const skip = (page - 1) * limit;

      this.query.push({ $skip: skip });
      this.query.push({ $limit: limit });
    }

    return this;
  }

  /**
   * Execute the aggregation pipeline and return the results
   * with pagination information if applicable
   */
  async execute(): Promise<ExecuteResult<T>> {
    this.result = await this.model.aggregate(this.query);

    const countQuery: PipelineStage[] = this.query.filter(
      (stage) => !('$limit' in stage || '$skip' in stage),
    );

    countQuery.push({ $count: 'total' });

    const output = await this.model.aggregate(countQuery);

    this.totalResults = output[0]?.total || 0;

    if (this.queryString.page || this.queryString.limit) {
      this.totalPages = Math.ceil(
        this.totalResults / (Number(this.queryString.limit) || 10),
      );
    }

    if (this.queryString.page || this.queryString.limit) {
      return {
        results: this.result,
        totalResults: this.totalResults,
        totalPages: this.totalPages || 1,
        limit: Number(this.queryString.limit) || 10,
        page: Number(this.queryString.page) || 1,
      };
    } else {
      return {
        results: this.result,
        totalResults: this.totalResults,
      };
    }
  }
}
