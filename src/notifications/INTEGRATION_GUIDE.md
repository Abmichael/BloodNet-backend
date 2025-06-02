# Notifications Integration Guide

The notifications module has been integrated into the existing services to automatically handle blood request notifications, donation result notifications, and appointment reminders.

## Integration Summary

### ✅ Blood Request Service Integration
**File**: `src/blood-request/blood-request.service.ts`

**New Methods Added**:
- `notifyBloodRequest(bloodRequestId, eligibleDonorIds, nearbyBloodBankIds)` - Send notifications about blood requests
- `fulfillBloodRequest(id, fulfilledByBloodBank)` - Update status and notify requester

**Usage Example**:
```typescript
// After creating a blood request
const bloodRequest = await bloodRequestService.create(createDto);

// Find eligible donors and nearby blood banks (implement based on your logic)
const eligibleDonors = await findEligibleDonors(bloodRequest.bloodType, bloodRequest.location);
const nearbyBloodBanks = await findNearbyBloodBanks(bloodRequest.location);

// Send notifications
await bloodRequestService.notifyBloodRequest(
  bloodRequest._id.toString(),
  eligibleDonors.map(d => d._id.toString()),
  nearbyBloodBanks.map(b => b._id.toString())
);

// When blood request is fulfilled
await bloodRequestService.fulfillBloodRequest(
  bloodRequestId,
  'Central Blood Bank'
);
```

### ✅ Donation Service Integration
**File**: `src/donation/donation.service.ts`

**New Method Added**:
- `notifyDonationResultsReady(donationId, bloodBankName)` - Notify donor when results are ready

**Usage Example**:
```typescript
// After donation results are processed (typically 24-48 hours after donation)
await donationService.notifyDonationResultsReady(
  donationId,
  'Central Blood Bank'
);
```

### ✅ Donation Schedule Service Integration
**File**: `src/donation-schedule/donation-schedule.service.ts`

**Automatic Integration**:
- Appointment reminders are automatically scheduled when creating new appointments
- No additional method calls needed - happens automatically in the `create()` method

**How it Works**:
```typescript
// When creating an appointment, reminders are automatically scheduled
const appointment = await donationScheduleService.create(createDto);
// Reminder notification is automatically scheduled for 24 hours before appointment
```

## Module Dependencies

All modules have been updated to import the `NotificationsModule`:

- ✅ `BloodRequestModule` - imports `NotificationsModule`
- ✅ `DonationModule` - imports `NotificationsModule`
- ✅ `DonationScheduleModule` - imports `NotificationsModule`
- ✅ `AppModule` - imports `NotificationsModule`

## API Endpoints Available

### Notification Management (for users)
- `GET /notifications/my-notifications` - Get current user's notifications
- `GET /notifications/unread-count` - Get unread notification count
- `PATCH /notifications/:id/read` - Mark notification as read
- `PATCH /notifications/mark-all-read` - Mark all notifications as read

### Admin Notification Management
- `GET /notifications` - Get all notifications (Admin only)
- `POST /notifications` - Create custom notification (Admin only)
- `DELETE /notifications/:id` - Delete notification (Admin only)

### Specialized Notification Endpoints
- `POST /notifications/blood-request-to-donors` - Manually notify donors about blood requests
- `POST /notifications/blood-request-to-blood-banks` - Manually notify blood banks
- `POST /notifications/donation-result-ready` - Manually notify donor about results
- `POST /notifications/appointment-reminder` - Manually schedule appointment reminders

## Notification Types

### 1. Blood Request Notifications
- **Recipients**: Eligible donors and nearby blood banks
- **Triggers**: New blood request created
- **Content**: Blood type needed, location, urgency level
- **Automatic**: Via `BloodRequestService.notifyBloodRequest()`

### 2. Donation Result Notifications
- **Recipients**: Donors who completed donations
- **Triggers**: Donation results are ready (manual trigger)
- **Content**: Notification that results are ready for in-person pickup
- **Manual**: Via `DonationService.notifyDonationResultsReady()`

### 3. Appointment Reminders
- **Recipients**: Donors with scheduled appointments
- **Triggers**: Appointment creation
- **Content**: Reminder about upcoming appointment
- **Automatic**: Via `DonationScheduleService.create()` (scheduled for 24h before)

### 4. Blood Request Fulfillment
- **Recipients**: Medical institution that made the request
- **Triggers**: Blood request status changed to fulfilled
- **Content**: Confirmation that request was fulfilled
- **Automatic**: Via `BloodRequestService.fulfillBloodRequest()`

## Implementation Notes

### To Complete Implementation:

1. **Donor/Blood Bank Discovery**: Implement logic to find eligible donors and nearby blood banks in `BloodRequestService`

2. **Blood Bank Name Resolution**: Update services to properly resolve blood bank names from IDs

3. **Population**: Ensure proper data population in services (e.g., bloodBank names)

4. **User-Donor Relationship**: Handle the relationship between User and Donor entities for notifications

### Scheduled Jobs

The notification system includes automatic background jobs:

- **Notification Processing**: Runs every hour to send scheduled notifications
- **Cleanup**: Runs daily at 2 AM to remove old notifications (30+ days)

### Policy Compliance

The donation result notifications comply with the stated policy:
- Donors are notified that results are ready
- They must visit the blood bank in person to collect results
- No sensitive medical information is transmitted via notifications

## Error Handling

All notification operations include error handling:
- Failed notifications are retried up to 3 times
- Notification failures don't break the main business operations
- Errors are logged for monitoring

## Testing

To test the notification system:

1. Create a blood request and call `notifyBloodRequest()`
2. Complete a donation and call `notifyDonationResultsReady()`
3. Schedule an appointment (automatic reminder)
4. Check notifications via the API endpoints
