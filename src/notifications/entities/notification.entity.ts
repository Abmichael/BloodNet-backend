import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
  BLOOD_REQUEST_NEW = 'blood_request_new',
  BLOOD_REQUEST_URGENT = 'blood_request_urgent',
  DONATION_RESULT_READY = 'donation_result_ready',
  BLOOD_REQUEST_FULFILLED = 'blood_request_fulfilled',
  BLOOD_REQUEST_EXPIRED = 'blood_request_expired',
  DONATION_APPOINTMENT_REMINDER = 'donation_appointment_reminder',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  READ = 'read',
  FAILED = 'failed',
}

export enum RecipientType {
  DONOR = 'donor',
  BLOOD_BANK = 'blood_bank',
  MEDICAL_INSTITUTION = 'medical_institution',
}

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, type: String, enum: Object.values(NotificationType) })
  type: NotificationType;

  @Prop({ required: true, type: String, enum: Object.values(RecipientType) })
  recipientType: RecipientType;

  @Prop({ type: Types.ObjectId, required: true, refPath: 'recipientModel' })
  recipientId: Types.ObjectId;

  @Prop({ required: true, type: String })
  recipientModel: string; // 'User', 'Donor', 'BloodBank', etc.

  @Prop({ required: true, type: String })
  title: string;

  @Prop({ required: true, type: String })
  message: string;

  @Prop({ type: Object })
  data?: Record<string, any>; // Additional data like blood request ID, donation ID, etc.

  @Prop({
    required: true,
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Date })
  scheduledFor?: Date; // For scheduled notifications

  @Prop({ type: Number, default: 0 })
  retryCount: number;

  @Prop({ type: String })
  errorMessage?: string;

  // Reference to the related entity that triggered this notification
  @Prop({ type: Types.ObjectId })
  relatedEntityId?: Types.ObjectId;

  @Prop({ type: String })
  relatedEntityType?: string; // 'BloodRequest', 'Donation', etc.
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index for efficient querying
NotificationSchema.index({ recipientId: 1, status: 1 });
NotificationSchema.index({ type: 1, scheduledFor: 1 });
NotificationSchema.index({ createdAt: -1 });
