import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ActivityType {
  DONATION = 'donation',
  DONATION_SCHEDULED = 'donation_scheduled',
  DONATION_COMPLETED = 'donation_completed',
  DONATION_CANCELLED = 'donation_cancelled',
  BLOOD_REQUEST = 'blood_request',
  BLOOD_REQUEST_FULFILLED = 'blood_request_fulfilled',
  BLOOD_REQUEST_CANCELLED = 'blood_request_cancelled',
  REGISTRATION = 'registration',
  USER_LOGIN = 'user_login',
  PROFILE_UPDATED = 'profile_updated',
  APPROVAL = 'approval',
  REJECTION = 'rejection',
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_REVIEWED = 'application_reviewed',
  BLOOD_BANK_REGISTERED = 'blood_bank_registered',
  MEDICAL_INSTITUTION_REGISTERED = 'medical_institution_registered',
  DONOR_REGISTERED = 'donor_registered',
  EMERGENCY = 'emergency',
  ALERT = 'alert',
  NOTIFICATION_SENT = 'notification_sent',
  INVENTORY_UPDATE = 'inventory_update',
}

@Schema({ timestamps: true, _id: true })
export class ActivityLog {
  @Prop({
    type: String,
    enum: Object.values(ActivityType),
    required: true,
    index: true,
  })
  activityType: ActivityType;

  @Prop({ required: true, type: String })
  title: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BloodBank' })
  bloodBankId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Donation' })
  donationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BloodRequest' })
  requestId?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export type ActivityLogDocument = ActivityLog &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// Indexes for better performance
ActivityLogSchema.index({ activityType: 1 });
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ userId: 1 });
