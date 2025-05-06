import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  DONOR = 'donor',
  HOSPITAL = 'hospital',
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
}

export const UserSchema = SchemaFactory.createForClass(User);
