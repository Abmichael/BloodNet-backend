import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BloodType } from '../../donor/entities/donor.entity';

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  FULFILLED = 'fulfilled',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

export enum RequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export type BloodRequestDocument = BloodRequest & Document;

@Schema({ timestamps: true })
export class BloodRequest {
  @Prop({ type: Types.ObjectId, ref: 'MedicalInstitution', required: true })
  institution: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  // Blood Information
  @Prop({ required: true, type: String, enum: Object.values(BloodType) })
  bloodType: BloodType;

  @Prop({ required: true, type: String, enum: ['+', '-'] })
  RhFactor: string;

  @Prop({ required: true, type: Number })
  unitsRequired: number;

  @Prop({ type: Number, default: 0 })
  unitsFulfilled: number;

  // Request Details
  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Prop({
    type: String,
    enum: Object.values(RequestPriority),
    default: RequestPriority.MEDIUM,
  })
  priority: RequestPriority;

  @Prop({ required: true, type: Date })
  requiredBy: Date;

  @Prop({ type: String, required: false })
  patientCondition?: string;

  @Prop({ type: String, required: false })
  notes?: string;

  // Fulfillment Details
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Donation' }], default: [] })
  donations?: Types.ObjectId[];

  // Location for proximity searches
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  // Notification Settings
  @Prop({ type: Boolean, default: true })
  notifyNearbyDonors: boolean;

  @Prop({ type: Number, default: 50 }) // in kilometers
  notificationRadius: number;
}

export const BloodRequestSchema = SchemaFactory.createForClass(BloodRequest);
BloodRequestSchema.index({ location: '2dsphere' });
BloodRequestSchema.index({ status: 1, requiredBy: 1, priority: 1 });
