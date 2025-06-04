import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApplicationDocument = Application & Document;

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ApplicationRole {
  BLOOD_BANK = 'blood_bank',
  MEDICAL_INSTITUTION = 'medical_institution',
}

@Schema({ timestamps: true, _id: true })
export class Application {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(ApplicationRole),
  })
  role: ApplicationRole;

  @Prop({
    required: true,
    type: Object,
  })
  profileData: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Prop({ type: String, required: false })
  rejectionReason?: string;

  @Prop({ type: Date, required: false })
  reviewedAt?: Date;

  @Prop({ type: String, required: false })
  reviewedBy?: string; // User ID of admin who reviewed

  @Prop({ type: String, required: false })
  createdUserId?: string; // User ID after approval

  @Prop({ type: String, required: false })
  createdEntityId?: string; // Blood Bank or Medical Institution ID after approval
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
