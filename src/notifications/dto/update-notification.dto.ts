import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';
import { NotificationStatus } from '../entities/notification.entity';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsDateString()
  sentAt?: string;

  @IsOptional()
  @IsDateString()
  readAt?: string;
}
