import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../entities/application.entity';

export class UpdateApplicationDto {
  @IsEnum(ApplicationStatus)
  @IsOptional()
  status?: ApplicationStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
