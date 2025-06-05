import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  IsMongoId,
} from 'class-validator';

export class CreateMedicalInstitutionDto {
  @IsMongoId()
  @IsOptional()
  user?: string;

  @IsString()
  name: string;

  @IsString()
  registrationNumber: string;

  @IsString()
  type: string;

  @IsString()
  phoneNumber: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  country: string;

  @IsString()
  @IsOptional()
  contactPersonName?: string;

  @IsString()
  @IsOptional()
  contactPersonRole?: string;

  @IsString()
  @IsOptional()
  contactPersonPhone?: string;

  @IsEmail()
  @IsOptional()
  contactPersonEmail?: string;

  @IsArray()
  @IsOptional()
  operatingHours?: string[];

  @IsArray()
  @IsOptional()
  services?: string[];

  @IsNumber({}, { each: true })
  coordinates: [number, number]; // [longitude, latitude]

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
