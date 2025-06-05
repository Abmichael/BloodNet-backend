import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsEmail,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BloodType } from '../entities/donor.entity';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  type: 'Point';

  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  coordinates: [number, number];
}

export class CreateDonorDto {
  @IsMongoId()
  @IsOptional()
  user?: string;

  // Personal Information
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  dateOfBirth: Date;

  @IsString()
  @IsEnum(['Male', 'Female', 'Other'])
  gender: string;

  // Emergency Contact
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  emergencyContactRelationship?: string;

  // Address Information
  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;
  // Blood Information
  @IsEnum(BloodType)
  @IsOptional()
  bloodType?: BloodType; // Optional for first-time donors

  @IsString()
  @IsOptional()
  RhFactor?: '+' | '-'; // Optional for first-time donors

  // Medical Information
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medicalConditions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medications?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergies?: string[];

  // Donation History
  @IsOptional()
  @IsDateString()
  lastDonationDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(0)
  totalDonations?: number;

  @IsOptional()
  @IsDateString()
  nextEligibleDate?: Date;

  // Location
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  // Eligibility and Preferences
  @IsOptional()
  @IsBoolean()
  isEligible?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveDonationAlerts?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  maxTravelDistance?: number;

  @IsOptional()
  @IsString()
  preferredDonationCenter?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDays?: string[];

  @IsOptional()
  @IsString()
  preferredTimeOfDay?: string;
}
