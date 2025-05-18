import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, IsBoolean, IsDateString, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
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
  user: string;

  @IsEnum(BloodType)
  bloodType: BloodType;

  @IsString()
  @IsNotEmpty()
  RhFactor: '+' | '-';

  @IsOptional()
  @IsDateString()
  lastDonationDate?: Date;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @IsBoolean()
  isEligible?: boolean;
}