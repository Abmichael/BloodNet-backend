import { Injectable, Logger } from '@nestjs/common';
import {
  BaseNotificationDeliveryService,
  ExternalNotificationData,
} from './base-notification-delivery.service';
import * as sgMail from '@sendgrid/mail';

/**
 * Email service implementation using SendGrid
 */
@Injectable()
export class EmailNotificationService extends BaseNotificationDeliveryService {
  private configured = false;
  private readonly logger = new Logger(EmailNotificationService.name);
  private readonly fromEmail: string = 'noreply@bloodnetwork.org';

  constructor() {
    super();

    // Check if SendGrid API key exists and initialize
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const configuredFromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (sendGridApiKey) {
      try {
        sgMail.setApiKey(sendGridApiKey);

        if (configuredFromEmail) {
          this.fromEmail = configuredFromEmail;
        }

        this.configured = true;
        this.logger.log('SendGrid email service configured successfully');
      } catch (error) {
        this.logger.error(`Failed to initialize SendGrid: ${error.message}`);
      }
    } else {
      this.logger.warn('SendGrid not configured: missing API key');
    }
  }

  async sendNotification(
    notification: ExternalNotificationData,
    recipientEmail: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `Email service not configured. Email would have been sent to ${recipientEmail}`,
      );
      return false;
    }

    try {
      // Format the email
      const formattedNotification = this.formatNotification(notification);

      // Prepare email message
      const msg = {
        to: recipientEmail,
        from: this.fromEmail,
        subject: formattedNotification.subject,
        text: formattedNotification.body,
        // You could add HTML version here later
      };

      // Send email via SendGrid
      await sgMail.send(msg);

      this.logger.log(`Email sent successfully to ${recipientEmail}`);
      this.logDelivery(notification, recipientEmail, true);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${recipientEmail}: ${error.message}`,
      );
      this.logDelivery(notification, recipientEmail, false);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getChannelType(): string {
    return 'email';
  }
}
