# Notifications Module

The Notifications module provides a comprehensive notification system for the BloodNet application. It handles various types of notifications related to blood requests, donation results, and appointment reminders.

## Implementation Status

### ✅ Core Functionality
- ✅ Entity schema with all notification types, statuses, recipient types
- ✅ Full CRUD service for notification management
- ✅ Scheduled notifications with cron jobs
- ✅ Role-based API with comprehensive endpoints
- ✅ Integration with BloodRequestService, DonationService, and DonationScheduleService
- ✅ Automatic donor and blood bank discovery for blood requests
- ✅ Blood bank name resolution for appointment reminders
- ✅ Policy-compliant donation result notifications

### ✅ External Services
- ✅ Email notifications with SendGrid
- ✅ SMS notifications with Twilio
- ✅ Push notifications with Firebase Cloud Messaging
- ✅ User notification preferences system
- ✅ Multi-channel delivery with preference-based routing

### 📝 Next Steps
- Enhanced notification analytics
- Message templating system
- Rate limiting for notifications
- See NOTIFICATION_SERVICES_SETUP_GUIDE.md for external services configuration

## Features

### Notification Types
- **Blood Request Notifications**: Notify donors and blood banks about new blood requests
- **Urgent Blood Requests**: Special notifications for critical/high priority requests  
- **Donation Results**: Notify donors when their test results are ready for collection
- **Blood Request Fulfillment**: Notify requesters when their requests are fulfilled
- **Appointment Reminders**: Scheduled reminders for donation appointments

### Core Functionality
- ✅ Create and manage notifications
- ✅ Scheduled notifications with cron jobs
- ✅ Mark notifications as read/unread
- ✅ Bulk operations (mark all as read)
- ✅ Notification filtering and pagination
- ✅ Automatic cleanup of old notifications
- ✅ Retry mechanism for failed notifications

## API Endpoints

### General Notification Management
- `GET /notifications` - Get all notifications (Admin only)
- `GET /notifications/my-notifications` - Get current user's notifications
- `GET /notifications/unread-count` - Get unread notification count
- `GET /notifications/:id` - Get specific notification
- `PATCH /notifications/:id` - Update notification (Admin only)
- `PATCH /notifications/:id/read` - Mark notification as read
- `PATCH /notifications/mark-all-read` - Mark all notifications as read
- `DELETE /notifications/:id` - Delete notification (Admin only)

### Specialized Notification Creation
- `POST /notifications/blood-request-to-donors` - Notify donors about blood requests
- `POST /notifications/blood-request-to-blood-banks` - Notify blood banks about requests
- `POST /notifications/donation-result-ready` - Notify donor that results are ready
- `POST /notifications/appointment-reminder` - Schedule appointment reminders

### Notification Preferences Management
- `GET /notification-preferences` - Get current user's notification preferences
- `POST /notification-preferences` - Update current user's notification preferences
- `GET /notification-preferences/donor/:id` - Get donor's preferences (Admin)
- `GET /notification-preferences/blood-bank/:id` - Get blood bank's preferences (Admin)
- `GET /notification-preferences/medical-institution/:id` - Get institution's preferences (Admin)
- `POST /notification-preferences/:userType/:id` - Update user's preferences (Admin)

## Usage Examples

### Creating Blood Request Notifications

```typescript
// Notify eligible donors about a new blood request
await notificationsService.notifyBloodRequestToDonors(
  bloodRequestId,
  'O+',
  'City Hospital',
  'high',
  ['donor1', 'donor2', 'donor3']
);

// Notify nearby blood banks
await notificationsService.notifyBloodRequestToBloodBanks(
  bloodRequestId,
  'O+', 
  'City Hospital',
  'high',
  ['bloodbank1', 'bloodbank2']
);
```

### Notifying Donation Results Ready

```typescript
await notificationsService.notifyDonationResultReady(
  donorId,
  donationId,
  new Date('2025-06-01'),
  'Central Blood Bank'
);
```

### Scheduling Appointment Reminders

```typescript
await notificationsService.notifyAppointmentReminder(
  donorId,
  appointmentId,
  new Date('2025-06-03T10:00:00'),
  'Central Blood Bank',
  '10:00 AM'
);
```

## Data Models

### Notification Entity
```typescript
{
  type: NotificationType;           // Type of notification
  recipientType: RecipientType;     // donor, blood_bank, medical_institution
  recipientId: ObjectId;            // ID of the recipient
  recipientModel: string;           // Model name for population
  title: string;                    // Notification title
  message: string;                  // Notification message
  data?: object;                    // Additional data
  status: NotificationStatus;       // pending, sent, read, failed
  sentAt?: Date;                    // When notification was sent
  readAt?: Date;                    // When notification was read
  scheduledFor?: Date;              // For scheduled notifications
  retryCount: number;               // Number of retry attempts
  errorMessage?: string;            // Error message if failed
  relatedEntityId?: ObjectId;       // Related entity (blood request, donation, etc.)
  relatedEntityType?: string;       // Type of related entity
  createdAt: Date;                  // Creation timestamp
  updatedAt: Date;                  // Last update timestamp
}
```

## Notification Types

### `NotificationType` Enum
- `BLOOD_REQUEST_NEW` - New blood request notification
- `BLOOD_REQUEST_URGENT` - Urgent blood request notification  
- `DONATION_RESULT_READY` - Donation test results are ready
- `BLOOD_REQUEST_FULFILLED` - Blood request has been fulfilled
- `BLOOD_REQUEST_EXPIRED` - Blood request has expired
- `DONATION_APPOINTMENT_REMINDER` - Appointment reminder

### `NotificationStatus` Enum
- `PENDING` - Notification created but not yet sent
- `SENT` - Notification has been sent
- `READ` - Notification has been read by recipient
- `FAILED` - Notification delivery failed

### `RecipientType` Enum
- `DONOR` - Notification for a donor
- `BLOOD_BANK` - Notification for a blood bank
- `MEDICAL_INSTITUTION` - Notification for a medical institution

## Scheduled Jobs

### Cron Jobs
- **Process Scheduled Notifications**: Runs every hour to send scheduled notifications
- **Cleanup Old Notifications**: Runs daily at 2 AM to remove old read/failed notifications (30+ days)

## Integration with Other Modules

### Blood Request Module Integration
```typescript
// In blood-request.service.ts
import { NotificationHelperService } from '../notifications/notification-helper.service';

// After creating a blood request
await this.notificationHelper.notifyNewBloodRequest(
  bloodRequest._id,
  bloodRequest.bloodType,
  bloodRequest.location,
  bloodRequest.priority,
  eligibleDonorIds,
  nearbyBloodBankIds
);
```

### Donation Module Integration
```typescript
// In donation.service.ts
// After donation is completed and results are processed
await this.notificationHelper.notifyDonationCompleted(
  donation.donor,
  donation._id,
  donation.donationDate,
  bloodBank.name
);
```

## Security & Authorization

- **Authentication**: All endpoints require JWT authentication
- **Role-based Access**: 
  - Admin: Full access to all notifications
  - Users: Can only access their own notifications
  - Blood Banks/Medical Institutions: Can create specific notification types

## External Notification Delivery

The notification system now includes support for external notification delivery channels:

### Available Channels
- ✅ Email notification delivery
- ✅ SMS notification delivery  
- ✅ Push notification delivery

### Configuration
External delivery services can be configured in the `.env` file:

```
# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@bloodnetwork.org

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Push Notifications (Firebase)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
```

### Notification Preferences
Users can manage their notification preferences through the notification preferences API:

- `GET /notification-preferences` - Get current user's preferences
- `POST /notification-preferences` - Update current user's preferences

### Implementation Details
The system will automatically try to deliver notifications through all available channels based on user preferences. If an external delivery service is not configured, the system will fall back to in-app notifications only.

For detailed implementation instructions, see [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md)

## Future Enhancements

### Planned Features
- [ ] Notification preferences per user
- [ ] Notification templates
- [ ] Analytics and reporting
- [ ] Real-time notifications via WebSocket

### Integration Points
- Email service (SendGrid, AWS SES, etc.)
- SMS service (Twilio, AWS SNS, etc.)
- Push notification service (Firebase, OneSignal, etc.)
- WebSocket for real-time notifications

## Error Handling

The service includes:
- Retry mechanism for failed notifications (up to 3 attempts)
- Error logging and tracking
- Graceful degradation when external services fail
- Status tracking for each notification

## Performance Considerations

- Database indexes for efficient querying
- Pagination for large notification lists
- Cleanup jobs to prevent database bloat
- Optimized queries for unread counts
