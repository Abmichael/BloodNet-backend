import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../entities/application.entity';

export class ReviewApplicationDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
