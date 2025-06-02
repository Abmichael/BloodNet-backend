import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsObject,
  IsNumber,
  IsArray,
  IsDate,
  ValidateNested,
  IsUrl,
  IsISO8601,
  IsEnum,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GeoPointDto {
  @IsEnum(['Point'])
  @IsNotEmpty()
  type: 'Point';

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  coordinates: [number, number]; // [longitude, latitude]
}

export class CreateBloodBankDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsObject()
  @ValidateNested()
  @Type(() => GeoPointDto)
  @IsNotEmpty()
  location: GeoPointDto;

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

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsString()
  @IsOptional()
  alternateContactNumber?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  operatingHours?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bloodTypesAvailable?: string[];

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsISO8601()
  @IsOptional()
  establishedDate?: string;
}
