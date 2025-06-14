import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import {
  CollectionMethod,
  DonationStatus,
  DonationType,
  BloodUnitStatus,
} from '../donation.constants';

export type DonationDocument = Donation & Document;

@Schema({ timestamps: true, _id: true })
export class Donation {
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

  @Prop({type: String, required: true})
  bloodType: string; // e.g., 'A+', 'O-', etc.

  @Prop({ required: true, type: Date })
  donationDate: Date;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(DonationStatus),
    default: DonationStatus.SCHEDULED,
  })
  status: DonationStatus;

  // Medical metrics at time of donation
  @Prop({ type: Number, required: false })
  weight?: number; // in kg

  @Prop({ type: Number, required: false })
  height?: number; // in cm

  @Prop({ type: Number, required: false })
  hemoglobinLevel?: number; // in g/dL

  @Prop({ type: Number, required: false })
  bloodPressureSystolic?: number; // in mmHg

  @Prop({ type: Number, required: false })
  bloodPressureDiastolic?: number; // in mmHg

  @Prop({ type: Number, required: false })
  pulseRate?: number; // in bpm

  @Prop({ type: Number, required: false })
  temperature?: number; // in Celsius

  // Blood donation details
  @Prop({ type: Number, required: false })
  volumeCollected?: number; // in ml

  @Prop({
    type: String,
    enum: [...Object.values(DonationType)],
    required: false,
  })
  donationType?: DonationType; // e.g., 'Whole Blood', 'Plasma', 'Platelets'

  @Prop({ type: String, required: false })
  bagNumber?: string;

  @Prop({
    type: String,
    enum: [...Object.values(CollectionMethod)],
    required: false,
  })
  collectionMethod?: CollectionMethod;

  // Staff and equipment
  @Prop({ type: String, required: false })
  phlebotomist?: string;

  // Post-donation
  @Prop({ type: Boolean, required: false })
  adverseReaction?: boolean;

  @Prop({ type: String, required: false })
  adverseReactionDetails?: string;

  @Prop({ type: Date, required: false })
  nextEligibleDonationDate?: Date;

  // Notes and additional information
  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: Boolean, default: true })
  isApproved: boolean;

  // Blood Unit Dispatch/Usage Tracking
  @Prop({
    type: String,
    enum: [...Object.values(BloodUnitStatus)],
    default: BloodUnitStatus.IN_INVENTORY,
    required: false,
  })
  unitStatus?: BloodUnitStatus;

  @Prop({ type: Date, required: false })
  dispatchedAt?: Date;

  @Prop({ type: String, required: false })
  dispatchedTo?: string; // Hospital/Institution name or ID

  @Prop({ type: String, required: false })
  usedFor?: string; // Patient ID or purpose

  @Prop({ type: Date, required: false })
  usedAt?: Date;

  @Prop({ type: String, required: false })
  discardReason?: string; // Reason for discard if applicable

  @Prop({ type: Date, required: false })
  discardedAt?: Date;

  @Prop({ type: Date, required: false })
  expiryDate?: Date; // Calculate based on donation date + shelf life

  // Related blood request (if reserved/dispatched for specific request)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: false,
  })
  reservedForRequest?: Types.ObjectId;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);
// Create compound index for donor and donation date
DonationSchema.index({ donor: 1, donationDate: -1 });
