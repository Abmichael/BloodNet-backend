# Handling Blood Request Notifications

This document provides instructions for configuring and implementing the blood request notification system.

## Blood Request Notification Workflow

When a blood request is created, the following workflow is triggered:

1. The `BloodRequestService.create()` method creates a new blood request
2. If `notifyNearbyDonors` is true, `BloodRequestService.sendBloodRequestNotifications()` is called
3. The method finds eligible donors and nearby blood banks based on:
   - Blood type compatibility
   - Geographic proximity
   - Donor eligibility
4. Notifications are sent to eligible donors and nearby blood banks through:
   - In-app notifications (always)
   - External channels (email, SMS, push) based on recipient preferences

## Implementation Guidelines

### Finding Compatible Donors

When determining donor compatibility, follow these blood type compatibility rules:

| Blood Request Type | Compatible Donor Types |
|-------------------|------------------------|
| A+                | A+, A-, O+, O-         |
| A-                | A-, O-                 |
| B+                | B+, B-, O+, O-         |
| B-                | B-, O-                 |
| AB+               | All types              |
| AB-               | A-, B-, AB-, O-        |
| O+                | O+, O-                 |
| O-                | O- only                |

### Blood Request Priority

The priority level affects how notifications are sent:

- **Critical**: Immediate notification to all eligible donors within a 25 km radius
- **High**: Notification to eligible donors within a 20 km radius
- **Medium**: Notification to eligible donors within a 15 km radius
- **Low**: Notification to eligible donors within a 10 km radius

### Eligibility Criteria

Donors are considered eligible if they meet the following criteria:

1. **Blood Type**: Compatible with the requested blood type
2. **Last Donation**: At least 56 days since their last donation
3. **Health Status**: Marked as eligible in the system
4. **Availability**: Not currently scheduled for another donation
5. **Location**: Within the defined radius based on priority

## Using the Notification API

### Creating Blood Request Notifications

```typescript
// Get eligible donors and nearby blood banks
const eligibleDonors = await donorService.findEligibleDonorsByBloodType(
  bloodRequest.bloodType,
  bloodRequest.RhFactor
);

const nearbyBloodBanks = await bloodBankService.findNearbyBloodBanks(
  bloodRequest.location.coordinates,
  50 // radius in km
);

// Send notifications
await notificationHelper.notifyNewBloodRequest(
  bloodRequest._id.toString(),
  bloodRequest.bloodType,
  "Central Hospital",
  bloodRequest.priority,
  eligibleDonors.map(d => d._id.toString()),
  nearbyBloodBanks.map(b => b._id.toString())
);
```

### Scheduling Notifications

For urgent blood requests, you can also schedule follow-up notifications:

```typescript
// Schedule a reminder notification for 4 hours later if request still unfulfilled
const scheduledDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
await notificationsService.create({
  type: NotificationType.BLOOD_REQUEST_URGENT,
  recipientType: RecipientType.DONOR,
  recipientId: donorId,
  recipientModel: 'Donor',
  title: '🚨 Urgent Blood Request Still Unfulfilled',
  message: `The urgent request for ${bloodType} blood is still unfulfilled. Please consider donating if you can.`,
  scheduledFor: scheduledDate.toISOString(),
  relatedEntityId: bloodRequestId,
  relatedEntityType: 'BloodRequest'
});
```

## Monitoring and Analytics

It's recommended to track the following metrics:

1. **Notification Delivery Rate**: Percentage of notifications successfully delivered
2. **Response Rate**: How many donors respond to notifications
3. **Conversion Rate**: How many notifications lead to actual donations
4. **Response Time**: How quickly donors respond to notifications

This data can be used to optimize notification strategies and improve blood request fulfillment rates.

## Best Practices

1. **Prioritize Critical Requests**: Ensure critical requests get highest visibility
2. **Avoid Notification Fatigue**: Limit the number of notifications sent to a donor in a given time period
3. **Personalize Messages**: Include relevant details that help donors make quick decisions
4. **Follow Up**: Send reminders for unfulfilled requests
5. **Respect Preferences**: Always respect donor notification preferences
