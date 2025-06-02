import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDate,
  IsBoolean,
  IsMongoId,
} from 'class-validator';
import { BloodType } from '../../donor/entities/donor.entity';
import {
  RequestPriority,
  RequestStatus,
} from '../entities/blood-request.entity';
import { Type } from 'class-transformer';

export class CreateBloodRequestDto {
  @IsMongoId()
  institution: string;

  @IsEnum(BloodType)
  bloodType: BloodType;

  @IsString()
  @IsEnum(['+', '-'])
  RhFactor: string;

  @IsNumber()
  unitsRequired: number;

  @IsEnum(RequestPriority)
  @IsOptional()
  priority?: RequestPriority;

  @IsDate()
  @Type(() => Date)
  requiredBy: Date;

  @IsString()
  @IsOptional()
  patientCondition?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber({}, { each: true })
  coordinates: [number, number]; // [longitude, latitude]

  @IsBoolean()
  @IsOptional()
  notifyNearbyDonors?: boolean;

  @IsNumber()
  @IsOptional()
  notificationRadius?: number;
}
