import { Injectable, Logger } from '@nestjs/common';
import {
  BaseNotificationDeliveryService,
  ExternalNotificationData,
} from './base-notification-delivery.service';
import { Twilio } from 'twilio';

/**
 * SMS service implementation using Twilio
 */
@Injectable()
export class SmsNotificationService extends BaseNotificationDeliveryService {
  private configured = false;
  private readonly logger = new Logger(SmsNotificationService.name);
  private twilioClient: Twilio | null = null;
  private fromPhoneNumber: string | null = null;

  constructor() {
    super();
    // Check if Twilio config exists and initialize
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER || null;

    if (accountSid && authToken && this.fromPhoneNumber) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.configured = true;
        this.logger.log('Twilio SMS service configured successfully');
      } catch (error) {
        this.logger.error(`Failed to initialize Twilio: ${error.message}`);
      }
    } else {
      this.logger.warn(
        'Twilio SMS service not configured: missing account SID, auth token, or phone number',
      );
    }
  }

  async sendNotification(
    notification: ExternalNotificationData,
    phoneNumber: string,
  ): Promise<boolean> {
    if (!this.isConfigured() || !this.twilioClient || !this.fromPhoneNumber) {
      this.logger.warn(
        `SMS service not configured. SMS would have been sent to ${phoneNumber}`,
      );
      return false;
    }

    try {
      // Format SMS message - keep it concise for SMS format
      const smsBody = `${notification.title}: ${notification.message}`;

      // Send SMS via Twilio
      await this.twilioClient.messages.create({
        body: smsBody,
        from: this.fromPhoneNumber,
        to: phoneNumber,
      });

      this.logger.log(`SMS sent successfully to ${phoneNumber}`);
      this.logDelivery(notification, phoneNumber, true);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${phoneNumber}: ${error.message}`,
      );
      this.logDelivery(notification, phoneNumber, false);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getChannelType(): string {
    return 'sms';
  }
}
