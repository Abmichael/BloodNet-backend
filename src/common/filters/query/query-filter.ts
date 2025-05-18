import { Query } from 'mongoose';
import { ExtendedQueryString } from './filter.types';

/**
 * Class for filtering, sorting, and paginating database queries.
 * 
 * @example
 * // In your controller
 * @Get()
 * async findAll(@Query() query: ExtendedQueryString) {
 *   const filter = new QueryFilter(Donor.find().populate('user'), query)
 *     .filter()
 *     .sort()
 *     .limitFields()
 *     .paginate();
 *     
 *   return await filter.getResults();
 * }
 */
export class QueryFilter {
  private query: Query<any, any>;
  private qs: ExtendedQueryString;

  /**
   * Create a new QueryFilter instance
   * @param query Mongoose query object
   * @param qs Query string parameters
   */
  constructor(query: any, qs: ExtendedQueryString) {
    this.query = query;
    this.qs = qs;
  }
  /**
   * Apply filters to the query based on query parameters
   * Supports two approaches:
   * 1. Complex query via the 'filter' parameter using a JSON string
   * 2. Simple field-based filtering with operators
   */
  filter() {
    const queryObject = { ...this.qs };
    const excludedFields = [
      'page',
      'sort',
      'limit',
      'fields',
      'search',
      'filter', // Exclude the filter parameter as it's handled separately
    ];
    excludedFields.forEach((el) => delete queryObject[el]);

    // Handle complex query if present
    if (this.qs.filter) {
      try {
        const filterObj = JSON.parse(this.qs.filter);
        this.query = this.query.find(filterObj);
        return this;
      } catch (error) {
        console.error('Failed to parse filter JSON:', error);
        // Continue with standard filtering if JSON parsing fails
      }
    }

    // Process standard field filters with operators
    const operators = ['gte', 'gt', 'lte', 'lt', 'eq', 'ne', 'regex', 'regex^'];
    const queryConditions: any = {};

    Object.keys(queryObject).forEach((key) => {
      const [field, operator] = key.split('[');
      if (operator && operators.includes(operator.slice(0, -1))) {
        if (!queryConditions[field]) {
          queryConditions[field] = {};
        }
        
        if (operator.slice(0, -1) === 'regex') {
          queryConditions[field][`$${operator.slice(0, -1)}`] = new RegExp(
            `${queryObject[key]}`,
            'i',
          );
        } else if (operator.slice(0, -1) === 'regex^') {
          queryConditions[field][`$${operator.slice(0, -1)}`] = new RegExp(
            `^${queryObject[key]}`,
            'i',
          );
        } else {
          queryConditions[field][`$${operator.slice(0, -1)}`] = queryObject[key];
        }
      } else {
        queryConditions[key] = queryObject[key];
      }
    });

    this.query = this.query.find(queryConditions);
    return this;
  }

  /**
   * Sort the query results based on the sort parameter
   * Format: field:asc,field2:desc or just field (defaults to asc)
   */
  sort() {
    const sortBy = this.qs['sort'];
    if (sortBy) {
      const sortObj: Record<string, 1 | -1> = {};
      sortBy.split(',').forEach((sortField) => {
        const [field, order] = sortField.trim().split(':');
        sortObj[field] = order === 'desc' ? -1 : 1;
      });
      this.query = this.query.sort(sortObj);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  /**
   * Limit the fields returned in the query results
   * Format: field1,field2,field3
   */
  limitFields() {
    let selectedFields = this.qs['fields'];
    if (selectedFields) {
      selectedFields = selectedFields.split(',').join(' ');
      this.query = this.query.select(selectedFields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  /**
   * Paginate the query results
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 10)
   */
  paginate() {
    if (!this.qs['limit'] && !this.qs['page']) {
      return this;
    }
    const page = this.qs['page'] !== undefined ? parseInt(this.qs['page'] as string, 10) || 1 : 1;
    const limit = this.qs['limit'] !== undefined ? parseInt(this.qs['limit'] as string, 10) || 10 : 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    this.qs['pagination'] = { page, limit };

    return this;
  }

  /**
   * Execute the query and return the results with pagination information
   */
  async getResults(): Promise<any> {
    const results = await this.query.exec();
    const totalResults = await this.query.model
      .countDocuments(this.query.getQuery())
      .exec();
    
    if (this.qs['pagination']) {
      const { page, limit } = this.qs['pagination'];
      const totalPages = Math.ceil(totalResults / limit);

      return {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
    } else {
      return { results, totalResults };
    }
  }
}
