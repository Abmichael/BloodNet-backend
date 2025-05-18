# Query Filter System for BloodNet API

This utility provides a standardized approach to implementing pagination, filtering, sorting, and field selection across all API endpoints. The implementation is controller-centric, meaning filters are applied directly in controllers rather than in services.

## Features

- **Complex Filtering** - Use MongoDB query objects for advanced filtering logic
- **Simple Filtering** - Filter records by any field with advanced operators
- **Pagination** - Limit results and get page information
- **Sorting** - Sort by any field(s) in ascending or descending order
- **Field Selection** - Select only the fields you need

## Usage in Controllers

Import the necessary classes and types from the filters module:

```typescript
import { QueryFilter, AggregationFilter, ExtendedQueryString } from '../common/filters/query';
```

### Basic Query Filter

Use `QueryFilter` for regular Mongoose queries:

```typescript
@Get()
async findAll(@Query() query: ExtendedQueryString) {
  const baseQuery = this.donorModel.find().populate('user');
  
  const filter = new QueryFilter(baseQuery, query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  return await filter.getResults();
}
```

### Aggregation Filter

Use `AggregationFilter` for MongoDB aggregation pipelines:

```typescript
@Get('stats')
async getStatistics(@Query() query: ExtendedQueryString) {
  const aggregation = new AggregationFilter(
    this.donorModel,
    [
      { 
        $group: { 
          _id: "$bloodType", 
          count: { $sum: 1 } 
        } 
      }
    ],
    query
  );
  
  return await aggregation
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .execute();
}
```

## Query String Parameters

### Filtering

#### Complex Query Filtering

For complex queries with nested logic, use the `filter` parameter with a JSON string representing a MongoDB query object:

```
GET /api/donors?filter={"$or":[{"bloodType":"A+"},{"$and":[{"age":{"$gte":18}},{"lastDonation":{"$lt":"2023-01-01"}}]}]}
```

This approach gives you full access to MongoDB's query language, including:
- Logical operators (`$and`, `$or`, `$nor`, `$not`)
- Comparison operators
- Array operators
- Element operators
- Nested conditions

#### Simple Field Filtering

For simpler filtering needs:

- Simple equality: `?bloodType=A+`
- Operators:
  - Greater than: `?age[gt]=18`
  - Greater than or equal: `?age[gte]=18`
  - Less than: `?age[lt]=65`
  - Less than or equal: `?age[lte]=65`
  - Not equal: `?bloodType[ne]=AB-`
  - Regular expression: `?name[regex]=John`
  - Regular expression (start with): `?name[regex^]=J`

### Sorting

- Single field ascending: `?sort=name`
- Single field descending: `?sort=name:desc`
- Multiple fields: `?sort=bloodType:asc,lastDonationDate:desc`

### Pagination

- Page number: `?page=2`
- Items per page: `?limit=10`
- Defaults to page 1 with 10 items per page if not specified

### Field Selection

- Include specific fields: `?fields=name,email,bloodType`
- Excludes the MongoDB internal `__v` field by default

## Response Format

The response will always be in a standardized format:

```json
{
  "results": [...],        // Array of matching records
  "totalResults": 150,     // Total number of matching records
  "page": 2,               // Current page number (if pagination used)
  "limit": 10,             // Items per page (if pagination used)
  "totalPages": 15         // Total number of pages (if pagination used)
}
```

## Example Queries

1. Get all donors with blood type A+ or O+, sorted by last donation date (newest first), showing only name, email and phone:
   ```
   GET /donors?filter={"$or":[{"bloodType":"A+"},{"bloodType":"O+"}]}&sort=lastDonationDate:desc&fields=name,email,phone
   ```

2. Get the second page of eligible donors who last donated before January 2023:
   ```
   GET /donors?filter={"isEligible":true,"lastDonationDate":{"$lt":"2023-01-01"}}&page=2&limit=20
   ```

3. Find donors whose names start with "J" (using the simple approach):
   ```
   GET /donors?name[regex^]=J
   ```

4. Complex query with AND and OR conditions:
   ```
   GET /donors?filter={"$or":[{"bloodType":"A+"},{"$and":[{"age":{"$gte":18}},{"lastDonation":{"$lt":"2023-01-01"}}]}]}
   ```
