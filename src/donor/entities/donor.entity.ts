// donor/schemas/donor.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum BloodType {
  'O',
  'A',
  'B',
  'AB',
}

export type DonorDocument = Donor & Document;

@Schema({ timestamps: true })
export class Donor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ required: true, type: String, enum: Object.keys(BloodType).filter(k => isNaN(Number(k))) })
  bloodType: BloodType;

  @Prop({ required: true, type: String, enum: ['+', '-'] })
  RhFactor: string;

  @Prop({ type: Date })
  lastDonationDate?: Date;

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({ default: true })
  isEligible: boolean;
}

export const DonorSchema = SchemaFactory.createForClass(Donor);
DonorSchema.index({ location: '2dsphere' });
