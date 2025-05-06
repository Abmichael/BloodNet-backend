import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BloodBank {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  location: string;

  @Prop()
  contactNumber: string;

  @Prop()
  email?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export type BloodBankDocument = BloodBank & Document;
export const BloodBankSchema = SchemaFactory.createForClass(BloodBank);
