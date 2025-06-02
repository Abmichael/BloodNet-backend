import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DonationStatus } from '../donation.constants';

export class CreateDonationDto {
  @IsMongoId()
  @IsNotEmpty()
  donor: string;

  @IsMongoId()
  @IsNotEmpty()
  bloodBank: string;

  @IsDate()
  @Type(() => Date)
  donationDate: Date;

  @IsEnum(DonationStatus)
  @IsOptional()
  status?: DonationStatus;

  // Medical metrics
  @IsNumber()
  @IsOptional()
  @Min(20) // Minimum weight in kg
  @Max(200) // Maximum weight in kg
  weight?: number;

  @IsNumber()
  @IsOptional()
  @Min(100) // Minimum height in cm
  @Max(250) // Maximum height in cm
  height?: number;

  @IsNumber()
  @IsOptional()
  @Min(4) // Minimum hemoglobin level
  @Max(25) // Maximum hemoglobin level
  hemoglobinLevel?: number;

  @IsNumber()
  @IsOptional()
  @Min(70) // Minimum systolic pressure
  @Max(200) // Maximum systolic pressure
  bloodPressureSystolic?: number;

  @IsNumber()
  @IsOptional()
  @Min(40) // Minimum diastolic pressure
  @Max(120) // Maximum diastolic pressure
  bloodPressureDiastolic?: number;

  @IsNumber()
  @IsOptional()
  @Min(40) // Minimum pulse rate
  @Max(200) // Maximum pulse rate
  pulseRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(35) // Minimum temperature
  @Max(42) // Maximum temperature
  temperature?: number;

  // Blood donation details
  @IsNumber()
  @IsOptional()
  @Min(100) // Minimum volume
  @Max(1000) // Maximum volume
  volumeCollected?: number;

  @IsString()
  @IsOptional()
  donationType?: string;

  @IsString()
  @IsOptional()
  bagNumber?: string;

  @IsString()
  @IsOptional()
  collectionMethod?: string;

  // Staff and equipment
  @IsString()
  @IsOptional()
  phlebotomist?: string;

  @IsString()
  @IsOptional()
  equipmentUsed?: string;

  // Post-donation
  @IsBoolean()
  @IsOptional()
  adverseReaction?: boolean;

  @IsString()
  @IsOptional()
  adverseReactionDetails?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  nextEligibleDonationDate?: Date;

  // Notes
  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isApproved?: boolean;
}
