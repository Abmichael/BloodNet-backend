import { IsString, IsOptional, IsNumberString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchUsersDto {

  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters long' })
  q: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;
}
