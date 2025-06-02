import { PartialType } from '@nestjs/mapped-types';
import { CreateDonationScheduleDto } from './create-donation-schedule.dto';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDate,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ScheduleStatus,
  ReminderStatus,
} from '../entities/donation-schedule.entity';

export class UpdateDonationScheduleDto extends PartialType(
  CreateDonationScheduleDto,
) {
  @IsEnum(ScheduleStatus)
  @IsOptional()
  status?: ScheduleStatus;

  @IsEnum(ReminderStatus)
  @IsOptional()
  reminderStatus?: ReminderStatus;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  reminderSentAt?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  confirmedAt?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  cancelledAt?: Date;

  @IsString()
  @IsOptional()
  cancellationReason?: string;

  @IsMongoId()
  @IsOptional()
  completedDonation?: string;
}
