import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateBloodBankDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  contactNumber?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
