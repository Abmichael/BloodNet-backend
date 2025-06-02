import { PartialType } from '@nestjs/mapped-types';
import { CreateBloodRequestDto } from './create-blood-request.dto';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';
import { RequestStatus } from '../entities/blood-request.entity';
import { Type } from 'class-transformer';

export class UpdateBloodRequestDto extends PartialType(CreateBloodRequestDto) {
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsNumber()
  @IsOptional()
  unitsFulfilled?: number;

  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  @Type(() => String)
  donations?: string[];
}
