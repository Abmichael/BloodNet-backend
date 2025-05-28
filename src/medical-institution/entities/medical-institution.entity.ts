import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MedicalInstitutionDocument = MedicalInstitution & Document;

@Schema({ timestamps: true })
export class MedicalInstitution {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  // Institution Information
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String, index: true, unique: true })
  registrationNumber: string;

  @Prop({ type: String, required: true })
  type: string; // Hospital, Clinic, etc.

  @Prop({ type: String, required: true })
  phoneNumber: string;

  @Prop({ type: String, required: false })
  email?: string;

  @Prop({ type: String, required: false })
  website?: string;

  // Address Information
  @Prop({ type: String, required: true })
  address: string;

  @Prop({ type: String, required: true })
  city: string;

  @Prop({ type: String, required: true })
  state: string;

  @Prop({ type: String, required: false })
  postalCode?: string;

  @Prop({ type: String, required: true })
  country: string;

  // Contact Person
  @Prop({ type: String, required: false })
  contactPersonName?: string;

  @Prop({ type: String, required: false })
  contactPersonRole?: string;

  @Prop({ type: String, required: false })
  contactPersonPhone?: string;

  @Prop({ type: String, required: false })
  contactPersonEmail?: string;

  // Operational Information
  @Prop({ type: [String], default: [] })
  operatingHours?: string[];

  @Prop({ type: [String], default: [] })
  services?: string[];

  // Location for proximity searches
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const MedicalInstitutionSchema = SchemaFactory.createForClass(MedicalInstitution);
MedicalInstitutionSchema.index({ location: '2dsphere' });
