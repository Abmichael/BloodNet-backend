import {
  IsString,
  IsEnum,
  IsOptional,
  IsDate,
  IsBoolean,
  IsMongoId,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleStatus } from '../entities/donation-schedule.entity';

export class CreateDonationScheduleDto {
  @IsMongoId()
  donor: string;

  @IsMongoId()
  bloodBank: string;

  @IsDate()
  @Type(() => Date)
  scheduledDate: Date;

  @IsString()
  @Matches(
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    {
      message: 'timeSlot must be in format HH:MM-HH:MM (e.g., 09:00-10:00)',
    },
  )
  timeSlot: string;

  @IsEnum(ScheduleStatus)
  @IsOptional()
  status?: ScheduleStatus;

  @IsString()
  @IsOptional()
  donationType?: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsOptional()
  contactMethod?: string;

  @IsBoolean()
  @IsOptional()
  sendReminders?: boolean;

  @IsMongoId()
  @IsOptional()
  scheduledBy?: string;

  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(240)
  estimatedDuration?: number;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurringPattern?: string;

  @IsMongoId()
  @IsOptional()
  parentSchedule?: string;
}
