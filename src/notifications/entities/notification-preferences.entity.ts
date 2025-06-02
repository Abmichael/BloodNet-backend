import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferencesDocument = NotificationPreferences &
  Document;

/**
 * Schema for storing user notification preferences
 */
@Schema({ timestamps: true })
export class NotificationPreferences {
  @Prop({ type: Types.ObjectId, required: true, refPath: 'userModel' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: String })
  userModel: string; // 'User', 'Donor', 'BloodBank', 'MedicalInstitution'

  @Prop({ required: true, type: String })
  userType: string; // 'donor', 'blood_bank', 'medical_institution', 'admin'

  // Delivery channel preferences
  @Prop({ type: Boolean, default: true })
  inAppEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  emailEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  smsEnabled: boolean;

  @Prop({ type: Boolean, default: false })
  pushEnabled: boolean;

  // Notification type preferences
  @Prop({
    type: {
      bloodRequest: { type: Boolean, default: true },
      donationResults: { type: Boolean, default: true },
      appointmentReminders: { type: Boolean, default: true },
      general: { type: Boolean, default: true },
    },
    _id: false,
  })
  types: {
    bloodRequest: boolean;
    donationResults: boolean;
    appointmentReminders: boolean;
    general: boolean;
  };

  // Contact information for notifications (optional, user may use profile info)
  @Prop({ type: String })
  preferredEmail?: string;

  @Prop({ type: String })
  preferredPhone?: string;

  @Prop({ type: String })
  deviceToken?: string;

  @Prop({ type: Date })
  lastUpdated: Date;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(
  NotificationPreferences,
);

// Create a compound index on userId and userModel for efficient lookups
NotificationPreferencesSchema.index(
  { userId: 1, userModel: 1 },
  { unique: true },
);
