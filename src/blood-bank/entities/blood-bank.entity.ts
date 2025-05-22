import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BloodBank {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  postalCode: string;

  @Prop()
  country: string;

  @Prop({ required: true })
  contactNumber: string;

  @Prop()
  alternateContactNumber?: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  website?: string;

  @Prop()
  operatingHours?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] })
  bloodTypesAvailable: string[];

  @Prop()
  licenseNumber?: string;

  @Prop()
  establishedDate?: Date;
}

export type BloodBankDocument = BloodBank & Document;
export const BloodBankSchema = SchemaFactory.createForClass(BloodBank);

// Create a 2dsphere index on location for geospatial queries
BloodBankSchema.index({ location: '2dsphere' });
