import { Injectable } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';
import { SmsNotificationService } from './sms-notification.service';
import { PushNotificationService } from './push-notification.service';
import { ExternalNotificationData } from './base-notification-delivery.service';

/**
 * Interface representing recipient contact information
 */
export interface RecipientContactInfo {
  email?: string;
  phoneNumber?: string;
  deviceToken?: string;
  preferences?: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
  };
}

/**
 * Service that manages delivery of notifications through multiple channels
 */
@Injectable()
export class NotificationDeliveryService {
  constructor(
    private emailService: EmailNotificationService,
    private smsService: SmsNotificationService,
    private pushService: PushNotificationService,
  ) {}

  /**
   * Send notification through all enabled channels for this recipient
   * @param notification Notification data to send
   * @param contactInfo Recipient contact information
   */
  async deliverNotification(
    notification: ExternalNotificationData,
    contactInfo: RecipientContactInfo,
  ): Promise<{
    email: boolean;
    sms: boolean;
    push: boolean;
  }> {
    const result = {
      email: false,
      sms: false,
      push: false,
    };

    try {
      // Send email if enabled and recipient has email
      if (
        contactInfo.email &&
        contactInfo.preferences?.emailEnabled !== false &&
        this.emailService.isConfigured()
      ) {
        result.email = await this.emailService.sendNotification(
          notification,
          contactInfo.email,
        );
      }

      // Send SMS if enabled and recipient has phone
      if (
        contactInfo.phoneNumber &&
        contactInfo.preferences?.smsEnabled !== false &&
        this.smsService.isConfigured()
      ) {
        result.sms = await this.smsService.sendNotification(
          notification,
          contactInfo.phoneNumber,
        );
      }

      // Send push notification if enabled and recipient has device token
      if (
        contactInfo.deviceToken &&
        contactInfo.preferences?.pushEnabled !== false &&
        this.pushService.isConfigured()
      ) {
        result.push = await this.pushService.sendNotification(
          notification,
          contactInfo.deviceToken,
        );
      }
    } catch (error) {
      console.error('Error in notification delivery:', error);
    }

    return result;
  }

  /**
   * Check if any external delivery service is configured
   */
  hasConfiguredServices(): boolean {
    return (
      this.emailService.isConfigured() ||
      this.smsService.isConfigured() ||
      this.pushService.isConfigured()
    );
  }
}
