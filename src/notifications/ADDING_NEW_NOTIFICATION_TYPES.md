# Adding New Notification Types

This guide provides instructions for adding new notification types to the BloodNet notification system.

## Overview

The notification system is designed to be extensible, allowing new notification types to be added with minimal changes to the core architecture. This document will guide you through the process of adding a new notification type.

## Step-by-Step Guide

### 1. Update Notification Types Enum

First, add your new notification type to the `NotificationType` enum in the notification entity file:

```typescript
// src/notifications/entities/notification.entity.ts

export enum NotificationType {
  BLOOD_REQUEST_NEW = 'blood_request_new',
  BLOOD_REQUEST_URGENT = 'blood_request_urgent',
  DONATION_RESULT_READY = 'donation_result_ready',
  DONATION_APPOINTMENT_REMINDER = 'donation_appointment_reminder',
  BLOOD_REQUEST_FULFILLED = 'blood_request_fulfilled',
  // Add your new type here, e.g.:
  EXPIRING_BLOOD_INVENTORY = 'expiring_blood_inventory',
}
```

### 2. Add Notification Message Templates

Next, add message templates for your new notification type in the constants file:

```typescript
// src/notifications/notifications.constants.ts

export const NOTIFICATION_MESSAGES = {
  // Existing templates...
  
  // Add your new notification type messages
  EXPIRING_BLOOD_INVENTORY: {
    TITLE: (bloodType: string) => `⚠️ Expiring Blood Inventory - ${bloodType}`,
    MESSAGE: (bloodType: string, expirationDate: string) => 
      `Units of ${bloodType} blood are expiring on ${expirationDate}. Please take appropriate action.`,
  },
};
```

### 3. Create Service Method for the New Notification

Add a specialized method in the `NotificationsService` to create this specific notification type:

```typescript
// src/notifications/notifications.service.ts

async notifyExpiringBloodInventory(
  bloodBankId: string,
  bloodType: string,
  expirationDate: Date,
  unitCount: number
): Promise<void> {
  const notification = {
    type: NotificationType.EXPIRING_BLOOD_INVENTORY,
    recipientType: RecipientType.BLOOD_BANK,
    recipientId: bloodBankId,
    recipientModel: 'BloodBank',
    title: NOTIFICATION_MESSAGES.EXPIRING_BLOOD_INVENTORY.TITLE(bloodType),
    message: NOTIFICATION_MESSAGES.EXPIRING_BLOOD_INVENTORY.MESSAGE(
      bloodType, 
      expirationDate.toLocaleDateString()
    ),
    data: {
      bloodType,
      expirationDate: expirationDate.toISOString(),
      unitCount,
    },
    relatedEntityType: 'BloodInventory',
    relatedEntityId: bloodBankId, // or specific inventory ID if available
  };

  await this.create(notification);
  this.logger.log(`Created expiring blood inventory notification for blood bank ${bloodBankId}`);
}
```

### 4. Add Helper Method (Optional)

If this notification is likely to be used from multiple services, consider adding a helper method in the `NotificationHelperService`:

```typescript
// src/notifications/notification-helper.service.ts

async notifyExpiringBloodInventory(
  bloodBankId: string,
  bloodType: string,
  expirationDate: Date,
  unitCount: number
): Promise<void> {
  await this.notificationsService.notifyExpiringBloodInventory(
    bloodBankId,
    bloodType,
    expirationDate,
    unitCount
  );
}
```

### 5. Add Controller Endpoint (Optional)

If the notification needs to be triggered via an API endpoint, add a new method to the `NotificationsController`:

```typescript
// src/notifications/notifications.controller.ts

@Post('expiring-blood-inventory')
@Roles(UserRole.ADMIN, UserRole.BLOOD_BANK)
async notifyExpiringBloodInventory(
  @Body() body: {
    bloodBankId: string;
    bloodType: string;
    expirationDate: string;
    unitCount: number;
  }
) {
  await this.notificationsService.notifyExpiringBloodInventory(
    body.bloodBankId,
    body.bloodType,
    new Date(body.expirationDate),
    body.unitCount
  );

  return {
    success: true,
    message: 'Expiring blood inventory notification sent',
  };
}
```

### 6. Integration with Business Logic

Integrate your new notification with the relevant business logic. For example, if this is an expiring blood inventory notification, you might add it to the blood inventory service:

```typescript
// src/blood-inventory/blood-inventory.service.ts

@Injectable()
export class BloodInventoryService {
  constructor(
    // Other dependencies...
    private notificationHelper: NotificationHelperService,
  ) {}

  // Method to check for expiring inventory
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiringInventory() {
    // Find all inventory items expiring in the next 3 days
    const expiringItems = await this.bloodInventoryModel.find({
      expirationDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    }).exec();

    // Group by blood bank and blood type
    const groupedItems = this.groupByBloodBankAndBloodType(expiringItems);

    // Send notifications for each group
    for (const [bloodBankId, bloodTypes] of Object.entries(groupedItems)) {
      for (const [bloodType, items] of Object.entries(bloodTypes)) {
        // Get the earliest expiration date
        const earliestExpiration = new Date(Math.min(...items.map(item => item.expirationDate.getTime())));
        
        // Send notification
        await this.notificationHelper.notifyExpiringBloodInventory(
          bloodBankId,
          bloodType,
          earliestExpiration,
          items.length
        );
      }
    }
  }
}
```

### 7. Update User Preferences (if necessary)

If users need specific control over this notification type, update the notification preferences schema:

```typescript
// src/notifications/entities/notification-preferences.entity.ts

@Prop({
  type: {
    bloodRequest: { type: Boolean, default: true },
    donationResults: { type: Boolean, default: true },
    appointmentReminders: { type: Boolean, default: true },
    general: { type: Boolean, default: true },
    // Add your new type
    expiringBloodInventory: { type: Boolean, default: true },
  },
  _id: false
})
types: {
  bloodRequest: boolean;
  donationResults: boolean;
  appointmentReminders: boolean;
  general: boolean;
  expiringBloodInventory: boolean;
};
```

### 8. Testing

Test your new notification type thoroughly:

1. Unit test the notification service method
2. Test the notification creation
3. Test the notification delivery through all channels (in-app, email, SMS, push)
4. Test user preferences for the new notification type
5. Test the business logic integration

## Best Practices

### Notification Content

1. **Title**: Keep titles concise and action-oriented, with an emoji for visual distinction
2. **Message**: Include all relevant details but keep messages concise
3. **Data**: Include structured data for programmatic use by the frontend

### When to Create a New Notification Type

Create a new notification type when:

1. The notification represents a distinct event type
2. Users might want specific control over receiving this notification
3. The notification requires specific styling or handling in the UI
4. The notification data structure is unique

### Notification Formatting

For consistency across the application, follow these formatting guidelines:

1. **Emojis**: Use relevant emojis at the start of titles to provide visual cues
2. **Title Format**: 
   - Urgent notifications: ❗ or 🚨
   - Information notifications: ℹ️ or 📝
   - Success notifications: ✅
   - Warning notifications: ⚠️

3. **Message Format**:
   - Include the key information in the first sentence
   - Use proper punctuation and capitalization
   - Avoid excessive technical details in the message (put those in data)

### Notification Priority

If your notification has variable priority, consider creating multiple notification types:

- `BLOOD_REQUEST_NEW` vs. `BLOOD_REQUEST_URGENT`
- `EXPIRING_BLOOD_INVENTORY` vs. `CRITICAL_BLOOD_SHORTAGE`

## Example Notification Types

Here are some examples of notification types that might be useful to add:

1. **Blood Donation Eligibility Restored**: Notify donors when they become eligible to donate again
2. **Blood Level Critical**: Notify blood banks when their inventory of a specific blood type is critically low
3. **Donation Milestone**: Notify donors when they reach donation milestones (e.g., 5th, 10th donation)
4. **Certification Expiring**: Notify blood banks or medical staff when certifications are about to expire
5. **Community Event**: Notify donors about upcoming blood drives or community events
