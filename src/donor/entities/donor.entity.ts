// donor/schemas/donor.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum BloodType {
  O = 'O',
  A = 'A',
  B = 'B',
  AB = 'AB',
}

export type DonorDocument = Donor & Document;

@Schema({ timestamps: true })
export class Donor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  // Personal Information
  @Prop({ required: true, type: String })
  firstName: string;

  @Prop({ required: true, type: String })
  lastName: string;

  // Phone number as identifier to link donor to user during signup
  @Prop({ required: true, type: String, index: true, unique: true })
  phoneNumber: string;

  @Prop({ type: String, required: false })
  email?: string;

  @Prop({ type: Date, required: true })
  dateOfBirth: Date;

  @Prop({ type: String, enum: ['Male', 'Female', 'Other'], required: true })
  gender: string;

  // Emergency Contact
  @Prop({ type: String, required: false })
  emergencyContactName?: string;

  @Prop({ type: String, required: false })
  emergencyContactPhone?: string;

  @Prop({ type: String, required: false })
  emergencyContactRelationship?: string;

  // Address Information
  @Prop({ type: String, required: false })
  address?: string;

  @Prop({ type: String, required: false })
  city?: string;

  @Prop({ type: String, required: false })
  state?: string;

  @Prop({ type: String, required: false })
  postalCode?: string;

  @Prop({ type: String, required: false })
  country?: string;

  // Blood Information
  @Prop({ required: false, type: String, enum: Object.values(BloodType) })
  bloodType?: BloodType; // May be undefined for first-time donors

  @Prop({ required: false, type: String, enum: ['+', '-'] })
  RhFactor?: string; // May be undefined for first-time donors

  // Medical Information
  @Prop({ type: [String], default: [] })
  medicalConditions?: string[];

  @Prop({ type: [String], default: [] })
  medications?: string[];

  @Prop({ type: [String], default: [] })
  allergies?: string[];

  // Donation History
  @Prop({ type: Date })
  lastDonationDate?: Date;

  @Prop({ type: Number, default: 0 })
  totalDonations: number;

  @Prop({ type: Date, required: false })
  nextEligibleDate?: Date;

  // Location for proximity searches
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  // Eligibility and Preferences
  @Prop({ default: true })
  isEligible: boolean;

  @Prop({ type: Boolean, default: true })
  receiveDonationAlerts: boolean;

  @Prop({ type: Number, default: 50 }) // in kilometers
  maxTravelDistance?: number;

  @Prop({ type: String, required: false })
  preferredDonationCenter?: string;

  @Prop({ type: [String], default: [] })
  availableDays?: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']

  @Prop({ type: String, required: false })
  preferredTimeOfDay?: string; // e.g., 'Morning', 'Afternoon', 'Evening'
}

export const DonorSchema = SchemaFactory.createForClass(Donor);
DonorSchema.index({ location: '2dsphere' });
