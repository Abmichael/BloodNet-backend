import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  DONOR = 'donor',
  BLOOD_BANK = 'blood_bank',
  MEDICAL_INSTITUTION = 'medical_institution',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.DONOR })
  role: UserRole;

  @Prop()
  name: string;

  @Prop({ unique: true, sparse: true })
  phoneNumber: string;

  @Prop({ default: false })
  profileComplete: boolean;

  // Resource associations - set when user is associated with specific documents
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: false })
  donorId?: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank',
    required: false,
  })
  bloodBankId?: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalInstitution',
    required: false,
  })
  institutionId?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
