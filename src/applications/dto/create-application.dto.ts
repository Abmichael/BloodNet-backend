import { 
  IsEmail, 
  IsString, 
  IsEnum, 
  IsObject, 
  ValidateNested, 
  MinLength,
  IsArray,
  IsOptional,
  IsNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationRole } from '../entities/application.entity';

class BloodBankProfileData {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsString()
  @IsOptional()
  alternateContactNumber?: string;

  @IsString()
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

  @IsObject()
  @IsNotEmpty()
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

class MedicalInstitutionProfileData {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsNotEmpty()
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

  @IsObject()
  @IsNotEmpty()
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export class CreateApplicationDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(ApplicationRole)
  role: ApplicationRole;

  @IsObject()
  profileData: any; // Allow any profile data structure
}
