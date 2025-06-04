import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AlertSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

export enum AlertType {
  INVENTORY_CRITICAL = 'inventory_critical',
  SYSTEM_ERROR = 'system_error',
  RESPONSE_TIME = 'response_time',
  UNUSUAL_ACTIVITY = 'unusual_activity',
}

@Schema({ timestamps: true })
export class Alert {
  @Prop({
    type: String,
    enum: Object.values(AlertType),
    required: true,
  })
  type: AlertType;

  @Prop({
    type: String,
    enum: Object.values(AlertSeverity),
    required: true,
    index: true,
  })
  severity: AlertSeverity;

  @Prop({ required: true, type: String })
  title: string;

  @Prop({ required: true, type: String })
  message: string;

  @Prop({ type: String })
  bloodType?: string;

  @Prop({ type: [String], default: [] })
  affectedBloodBanks: string[];

  @Prop({ type: Boolean, default: false, index: true })
  resolved: boolean;

  @Prop({ type: String })
  resolvedBy?: string;

  @Prop({ type: String })
  resolution?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export type AlertDocument = Alert & Document;
export const AlertSchema = SchemaFactory.createForClass(Alert);
