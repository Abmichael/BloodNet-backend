import { IsEnum, IsOptional, IsString, IsDateString, IsMongoId } from 'class-validator';
import { BloodUnitStatus } from '../donation.constants';

export class UpdateBloodUnitStatusDto {
  @IsEnum(BloodUnitStatus)
  unitStatus: BloodUnitStatus;

  @IsOptional()
  @IsString()
  dispatchedTo?: string;

  @IsOptional()
  @IsDateString()
  dispatchedAt?: string;

  @IsOptional()
  @IsString()
  usedFor?: string;

  @IsOptional()
  @IsDateString()
  usedAt?: string;

  @IsOptional()
  @IsString()
  discardReason?: string;

  @IsOptional()
  @IsDateString()
  discardedAt?: string;

  @IsOptional()
  @IsMongoId()
  reservedForRequest?: string;
}

export class DispatchBloodUnitDto {
  @IsString()
  dispatchedTo: string;

  @IsOptional()
  @IsDateString()
  dispatchedAt?: string;

  @IsOptional()
  @IsMongoId()
  forRequest?: string;
}

export class UseBloodUnitDto {
  @IsString()
  usedFor: string;

  @IsOptional()
  @IsDateString()
  usedAt?: string;
}

export class DiscardBloodUnitDto {
  @IsString()
  discardReason: string;

  @IsOptional()
  @IsDateString()
  discardedAt?: string;
}

export class FulfillBloodRequestDto {
  @IsMongoId()
  requestId: string;

  @IsString()
  bloodBankId: string;

  @IsOptional()
  @IsMongoId({ each: true })
  bloodUnitIds?: string[];
}

export class AutoFulfillBloodRequestDto {
  @IsString()
  bloodType: string;

  @IsString()
  rhFactor: string;

  @IsString()
  unitsNeeded: string; // Will be parsed to number

  @IsOptional()
  @IsMongoId()
  bloodBankId?: string;
}
