import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum ReminderStatus {
  NOT_SENT = 'NOT_SENT',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export type DonationScheduleDocument = DonationSchedule & Document;

@Schema({ timestamps: true, _id: true, id: true })
export class DonationSchedule {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true,
    index: true,
  })
  donor: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank',
    required: true,
  })
  bloodBank: Types.ObjectId;

  @Prop({ required: true, type: Date, index: true })
  scheduledDate: Date;

  @Prop({ required: true, type: String })
  timeSlot: string; // e.g., "09:00-10:00", "14:30-15:30"

  @Prop({
    required: true,
    type: String,
    enum: Object.values(ScheduleStatus),
    default: ScheduleStatus.SCHEDULED,
  })
  status: ScheduleStatus;

  // Donation preference
  @Prop({ type: String, required: false })
  donationType?: string; // e.g., 'Whole Blood', 'Plasma', 'Platelets'

  @Prop({ type: String, required: false })
  purpose?: string; // e.g., 'Regular Donation', 'Emergency Request', 'Blood Drive'

  // Contact and notification preferences
  @Prop({ type: String, required: false })
  contactMethod?: string; // e.g., 'Phone', 'Email', 'SMS'

  @Prop({ type: Boolean, default: true })
  sendReminders: boolean;

  @Prop({
    type: String,
    enum: Object.values(ReminderStatus),
    default: ReminderStatus.NOT_SENT,
  })
  reminderStatus: ReminderStatus;

  @Prop({ type: Date, required: false })
  reminderSentAt?: Date;

  // Scheduling details
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  })
  scheduledBy?: Types.ObjectId; // User who created the schedule (admin/staff)

  @Prop({ type: Date, required: false })
  confirmedAt?: Date;

  @Prop({ type: Date, required: false })
  cancelledAt?: Date;

  @Prop({ type: String, required: false })
  cancellationReason?: string;

  // Additional information
  @Prop({ type: String, required: false })
  specialInstructions?: string;

  @Prop({ type: String, required: false })
  notes?: string;

  // Related donation (if completed)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
    required: false,
  })
  completedDonation?: Types.ObjectId;

  // Estimated duration in minutes
  @Prop({ type: Number, default: 60 })
  estimatedDuration: number;

  // Recurring schedule support
  @Prop({ type: Boolean, default: false })
  isRecurring: boolean;

  @Prop({ type: String, required: false })
  recurringPattern?: string; // e.g., 'weekly', 'monthly', 'every-3-months'

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationSchedule',
    required: false,
  })
  parentSchedule?: Types.ObjectId; // Reference to parent if this is a recurring instance
}

export const DonationScheduleSchema =
  SchemaFactory.createForClass(DonationSchedule);

// Create indexes for better query performance
DonationScheduleSchema.index({ donor: 1, scheduledDate: -1 });
DonationScheduleSchema.index({ bloodBank: 1, scheduledDate: 1 });
DonationScheduleSchema.index({ status: 1, scheduledDate: 1 });
DonationScheduleSchema.index({ scheduledDate: 1, timeSlot: 1 });
