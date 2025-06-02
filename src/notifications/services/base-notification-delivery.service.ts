import { Injectable } from '@nestjs/common';

/**
 * Interface representing notification data used for external notifications
 */
export interface ExternalNotificationData {
  title: string;
  message: string;
  recipientId: string;
  recipientType: string;
  type: string;
  data?: any;
}

/**
 * Base class for notification delivery services
 * All external notification services (email, SMS, push) should extend this class
 */
@Injectable()
export abstract class BaseNotificationDeliveryService {
  /**
   * Send a notification through the specific channel
   * @param notification The notification data to send
   * @param recipientContact The contact info (email, phone, etc.) to send to
   */
  abstract sendNotification(
    notification: ExternalNotificationData,
    recipientContact: string,
  ): Promise<boolean>;

  /**
   * Check if the service is configured and ready to send
   */
  abstract isConfigured(): boolean;

  /**
   * Get the notification channel type (email, sms, push)
   */
  abstract getChannelType(): string;

  /**
   * Format notification data for the specific channel
   * @param notification The notification data to format
   */
  protected formatNotification(notification: ExternalNotificationData): any {
    return {
      subject: notification.title,
      body: notification.message,
      data: notification.data,
    };
  }

  /**
   * Log notification delivery
   * @param notification The notification that was delivered
   * @param recipientContact The contact the notification was delivered to
   * @param success Whether the delivery was successful
   */
  protected logDelivery(
    notification: ExternalNotificationData,
    recipientContact: string,
    success: boolean,
  ): void {
    if (success) {
      console.log(
        `Successfully sent ${this.getChannelType()} notification "${notification.title}" to ${recipientContact}`,
      );
    } else {
      console.error(
        `Failed to send ${this.getChannelType()} notification "${notification.title}" to ${recipientContact}`,
      );
    }
  }
}
