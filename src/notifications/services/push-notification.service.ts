import { Injectable, Logger } from '@nestjs/common';
import {
  BaseNotificationDeliveryService,
  ExternalNotificationData,
} from './base-notification-delivery.service';
import * as admin from 'firebase-admin';

/**
 * Push notification service implementation using Firebase Cloud Messaging (FCM)
 */
@Injectable()
export class PushNotificationService extends BaseNotificationDeliveryService {
  private configured = false;
  private readonly logger = new Logger(PushNotificationService.name);

  constructor() {
    super();

    // Check if Firebase config exists and initialize
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        // Initialize Firebase app if not already initialized
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
        }

        this.configured = true;
        this.logger.log(
          'Firebase push notification service configured successfully',
        );
      } catch (error) {
        this.logger.error(`Failed to initialize Firebase: ${error.message}`);
      }
    } else {
      this.logger.warn(
        'Firebase push notification service not configured: missing project credentials',
      );
    }
  }

  async sendNotification(
    notification: ExternalNotificationData,
    deviceToken: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `Push notification service not configured. Push would have been sent to device ${deviceToken}`,
      );
      return false;
    }

    try {
      // Send push notification via Firebase Cloud Messaging
      await admin.messaging().send({
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: notification.data || {},
      });

      this.logger.log(
        `Push notification sent successfully to device ${deviceToken}`,
      );
      this.logDelivery(notification, deviceToken, true);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to device ${deviceToken}: ${error.message}`,
      );
      this.logDelivery(notification, deviceToken, false);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getChannelType(): string {
    return 'push';
  }
}
