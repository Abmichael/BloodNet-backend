import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BloodType } from 'src/donor/entities/donor.entity';

@Schema({ timestamps: true })
export class BloodBag {
  @Prop({ required: true, unique: true })
  bagId: string;

  @Prop({ type: Types.ObjectId, ref: 'Donor', required: true })
  donor: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BloodBank', required: true })
  bloodBank: Types.ObjectId;

  @Prop({ required: true })
  bloodType: BloodType;

  @Prop({ default: 'available', enum: ['available', 'reserved', 'used', 'expired'] })
  status: string;

  @Prop()
  volume: number; // in mL

  @Prop()
  donationDate: Date;

  @Prop({ default: false })
  tested: boolean;

  @Prop({ type: Object })
  testResults?: Record<string, string | boolean>; // e.g. HIV: false, HBV: false
}

export type BloodBagDocument = BloodBag & Document;
export const BloodBagSchema = SchemaFactory.createForClass(BloodBag);
