import {
  IsEnum,
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  IsMongoId,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  NotificationType,
  RecipientType,
} from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @IsMongoId()
  recipientId: string;

  @IsString()
  recipientModel: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsMongoId()
  relatedEntityId?: string;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;
}
