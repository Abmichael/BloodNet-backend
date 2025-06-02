# Setting Up External Notification Delivery Services

This guide provides instructions for setting up external notification delivery services to extend the current notification system with SMS, email, and push notification capabilities.

## Overview

The notifications module is currently set up to handle in-app notifications. To deliver notifications through external channels (email, SMS, push notifications), you'll need to integrate third-party services.

## Recommended Services

Based on the project requirements mentioned in README.md, the following services are recommended:

### 1. Email Notifications - SendGrid

SendGrid provides a reliable email service with good deliverability and tracking features.

#### Setup Steps:

1. **Create a SendGrid account**: 
   - Sign up at [sendgrid.com](https://sendgrid.com)
   - Create an API key with appropriate permissions

2. **Install the SendGrid package**:
   ```bash
   npm install @sendgrid/mail
   ```

3. **Create a SendGrid email service**:
   ```typescript
   // src/notifications/services/email.service.ts
   import { Injectable } from '@nestjs/common';
   import * as sgMail from '@sendgrid/mail';
   import { ConfigService } from '@nestjs/config';

   @Injectable()
   export class EmailService {
     constructor(private configService: ConfigService) {
       sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
     }

     async sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
       try {
         await sgMail.send({
           to,
           from: this.configService.get('SENDGRID_FROM_EMAIL'),
           subject,
           text,
           html: html || text,
         });
         return true;
       } catch (error) {
         console.error('Error sending email:', error);
         return false;
       }
     }
   }
   ```

### 2. SMS Notifications - Twilio

Twilio is a leading provider for SMS services with excellent documentation and reliability.

#### Setup Steps:

1. **Create a Twilio account**:
   - Sign up at [twilio.com](https://twilio.com)
   - Get your Account SID, Auth Token, and a Twilio phone number

2. **Install the Twilio package**:
   ```bash
   npm install twilio
   ```

3. **Create a Twilio SMS service**:
   ```typescript
   // src/notifications/services/sms.service.ts
   import { Injectable } from '@nestjs/common';
   import { Twilio } from 'twilio';
   import { ConfigService } from '@nestjs/config';

   @Injectable()
   export class SmsService {
     private twilioClient: Twilio;

     constructor(private configService: ConfigService) {
       this.twilioClient = new Twilio(
         this.configService.get('TWILIO_ACCOUNT_SID'),
         this.configService.get('TWILIO_AUTH_TOKEN')
       );
     }

     async sendSms(to: string, body: string): Promise<boolean> {
       try {
         await this.twilioClient.messages.create({
           to,
           from: this.configService.get('TWILIO_PHONE_NUMBER'),
           body,
         });
         return true;
       } catch (error) {
         console.error('Error sending SMS:', error);
         return false;
       }
     }
   }
   ```

### 3. Push Notifications - Firebase Cloud Messaging (FCM)

Firebase Cloud Messaging is ideal for sending push notifications to both Android and iOS devices.

#### Setup Steps:

1. **Set up Firebase project**:
   - Create a project in [Firebase Console](https://console.firebase.google.com/)
   - Generate service account credentials

2. **Install the Firebase Admin SDK**:
   ```bash
   npm install firebase-admin
   ```

3. **Create a Firebase push notification service**:
   ```typescript
   // src/notifications/services/push-notification.service.ts
   import { Injectable } from '@nestjs/common';
   import * as admin from 'firebase-admin';
   import { ConfigService } from '@nestjs/config';

   @Injectable()
   export class PushNotificationService {
     constructor(private configService: ConfigService) {
       // Initialize Firebase if not already initialized
       if (!admin.apps.length) {
         admin.initializeApp({
           credential: admin.credential.cert({
             projectId: this.configService.get('FIREBASE_PROJECT_ID'),
             clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
             privateKey: this.configService.get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
           }),
         });
       }
     }

     async sendPushNotification(token: string, title: string, body: string, data?: any): Promise<boolean> {
       try {
         await admin.messaging().send({
           token,
           notification: {
             title,
             body,
           },
           data,
         });
         return true;
       } catch (error) {
         console.error('Error sending push notification:', error);
         return false;
       }
     }

     async sendMulticastPushNotification(tokens: string[], title: string, body: string, data?: any): Promise<boolean> {
       try {
         await admin.messaging().sendMulticast({
           tokens,
           notification: {
             title,
             body,
           },
           data,
         });
         return true;
       } catch (error) {
         console.error('Error sending multicast push notification:', error);
         return false;
       }
     }
   }
   ```

## Integration with Notification Service

Update the NotificationsService to use these external services:

```typescript
// src/notifications/notifications.service.ts

// Add to constructor:
constructor(
  // ... existing dependencies
  private emailService: EmailService,
  private smsService: SmsService,
  private pushNotificationService: PushNotificationService,
) {}

// Modify sendNotification method:
private async sendNotification(notification: NotificationDocument): Promise<void> {
  // Send in-app notification (existing logic)
  notification.status = NotificationStatus.SENT;
  notification.sentAt = new Date();
  await notification.save();
  
  // Additionally send via external channels based on recipient preferences
  try {
    // Get recipient's contact info and preferences (implement this method)
    const recipientInfo = await this.getRecipientInfo(notification.recipientId, notification.recipientModel);
    
    // Send email if recipient has email and has enabled email notifications
    if (recipientInfo.email && recipientInfo.preferences.emailEnabled) {
      await this.emailService.sendEmail(
        recipientInfo.email,
        notification.title,
        notification.message
      );
    }
    
    // Send SMS if recipient has phone number and has enabled SMS notifications
    if (recipientInfo.phoneNumber && recipientInfo.preferences.smsEnabled) {
      await this.smsService.sendSms(
        recipientInfo.phoneNumber,
        `${notification.title}: ${notification.message}`
      );
    }
    
    // Send push notification if recipient has push token and has enabled push notifications
    if (recipientInfo.pushToken && recipientInfo.preferences.pushEnabled) {
      await this.pushNotificationService.sendPushNotification(
        recipientInfo.pushToken,
        notification.title,
        notification.message,
        notification.data
      );
    }
  } catch (error) {
    console.error('Error sending external notifications:', error);
    // Don't mark as failed if only external delivery fails
  }
}
```

## Environment Configuration

Add the following to your `.env` file:

```
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourblooddonationapp.com

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
```

## Notification Preferences

Create a system for users to manage their notification preferences. This requires:

1. Adding notification preferences to user/donor/blood bank entities
2. Creating API endpoints for updating notification preferences
3. Respecting these preferences when sending notifications

## Testing External Services

For testing in development:

1. **Email**: Use [Mailtrap](https://mailtrap.io/) as a fake SMTP server
2. **SMS**: Use Twilio's test credentials
3. **Push**: Use Firebase's test mode

## Considerations for Production

1. Implement proper error handling for all external services
2. Add retry mechanisms for failed notifications
3. Set up monitoring for notification delivery rates
4. Implement rate limiting to prevent abuse
5. Consider implementing a queue system for high-volume notifications
6. Ensure compliance with local laws regarding SMS and email communications
