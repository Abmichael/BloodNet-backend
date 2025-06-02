# External Notification Services Setup Guide

This guide provides detailed instructions for setting up and configuring the external notification services (email, SMS, and push notifications) for the BloodNet notification system.

## Overview

The BloodNet notification system supports multiple delivery channels:
1. In-app notifications (always enabled)
2. Email notifications via SendGrid
3. SMS notifications via Twilio
4. Push notifications via Firebase Cloud Messaging (FCM)

This guide will help you set up each external service.

## Prerequisites

- A SendGrid account (for email notifications)
- A Twilio account (for SMS notifications)
- A Firebase project (for push notifications)
- Access to your server's environment variables

## Configuration Steps

### 1. Email Notifications with SendGrid

#### A. Create a SendGrid Account

1. Sign up at [SendGrid](https://sendgrid.com/) if you don't already have an account
2. Verify your account and domain
3. Create an API key with appropriate permissions:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it "BloodNet Notification System"
   - Select "Full Access" or "Restricted Access" with "Mail Send" permissions
   - Copy the generated API key (you'll need it for the .env file)

#### B. Configure SendGrid in BloodNet

1. Add the following to your `.env` file:
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   SENDGRID_FROM_EMAIL=notifications@your-domain.com
   ```

2. Make sure the `from` email address is properly authenticated in your SendGrid account

3. Restart the application for the changes to take effect

#### C. Testing SendGrid Integration

1. Update a user's notification preferences to include a valid email address
2. Trigger a notification (e.g., create a blood request)
3. Check the logs to confirm the email was sent successfully
4. Check the recipient's inbox to verify delivery

### 2. SMS Notifications with Twilio

#### A. Create a Twilio Account

1. Sign up at [Twilio](https://www.twilio.com/) if you don't already have an account
2. Navigate to the Console Dashboard
3. Get your Account SID and Auth Token from the dashboard
4. Purchase a phone number capable of sending SMS messages
   - Go to Phone Numbers → Buy a Number
   - Ensure SMS capabilities are enabled for the number

#### B. Configure Twilio in BloodNet

1. Add the following to your `.env` file:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
   ```
   
   Note: The phone number should be in E.164 format, e.g., `+15551234567`

2. Restart the application for the changes to take effect

#### C. Testing Twilio Integration

1. Update a user's notification preferences to include a valid phone number
2. Trigger a notification that would send an SMS (e.g., urgent blood request)
3. Check the logs to confirm the SMS was sent successfully
4. Check the recipient's phone to verify delivery
5. You can also check the Twilio console for delivery status

### 3. Push Notifications with Firebase Cloud Messaging

#### A. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the setup wizard
3. Once the project is created, add an app to your project:
   - Select the platform (Android, iOS, or Web)
   - Follow the setup instructions

#### B. Generate Service Account Credentials

1. In the Firebase console, go to Project Settings
2. Go to the "Service accounts" tab
3. Click "Generate new private key"
4. Save the JSON file securely

#### C. Configure Firebase in BloodNet

1. From the downloaded service account JSON, extract the following information:
   - `project_id`
   - `client_email`
   - `private_key`

2. Add the following to your `.env` file:
   ```
   FIREBASE_PROJECT_ID=your_project_id_here
   FIREBASE_CLIENT_EMAIL=your_client_email_here
   FIREBASE_PRIVATE_KEY="your_private_key_here_with_quotes"
   ```
   
   Note: The private key must be enclosed in quotes and include the newline characters (`\n`)

3. Restart the application for the changes to take effect

#### D. Testing Firebase Integration

1. Update a user's notification preferences to include a device token
2. Trigger a notification that would send a push notification
3. Check the logs to confirm the notification was sent successfully
4. Check the device to verify delivery
5. You can also check the Firebase console for analytics on notification delivery

## Managing User Preferences

Users can manage their notification preferences through the following endpoints:

- `GET /notification-preferences` - Get current notification preferences
- `POST /notification-preferences` - Update notification preferences

Administrators can manage preferences for any user through:

- `GET /notification-preferences/{userType}/{userId}` - Get a user's preferences
- `POST /notification-preferences/{userType}/{userId}` - Update a user's preferences

## Troubleshooting

### Common Issues

#### Email Delivery Issues

1. Check that SendGrid API key is valid and has proper permissions
2. Verify the sender email is authenticated in SendGrid
3. Check if emails are being filtered as spam
4. Review the application logs for specific error messages

#### SMS Delivery Issues

1. Verify Twilio account has sufficient funds
2. Check that the phone number is in valid E.164 format
3. Ensure Twilio number has SMS capabilities
4. Review Twilio logs in the console for error codes

#### Push Notification Issues

1. Verify Firebase service account credentials are correct
2. Check that device tokens are valid and not expired
3. Ensure clients are properly registered for notifications
4. Review Firebase console logs for delivery issues

## Best Practices

1. **Rate Limiting**: Be mindful of notification frequency to prevent user fatigue
2. **Message Length**: Keep SMS messages concise to avoid splitting and additional charges
3. **Error Handling**: Implement robust error handling for all external services
4. **Fallbacks**: If one delivery method fails, attempt another method if possible
5. **Testing**: Thoroughly test all notification channels before deploying to production
6. **Monitoring**: Set up monitoring to track delivery rates and failures
7. **Templates**: Use standardized templates for consistent messaging
8. **Compliance**: Ensure all notifications comply with relevant regulations (GDPR, TCPA, etc.)
