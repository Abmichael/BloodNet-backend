import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { BloodType } from '../donor/entities/donor.entity';
import { RequestPriority } from '../blood-request/entities/blood-request.entity';

@Injectable()
export class NotificationHelperService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async notifyNewBloodRequest(
    bloodRequestId: string,
    bloodType: BloodType,
    location: string,
    priority: RequestPriority,
    eligibleDonorIds: string[],
    nearbyBloodBankIds: string[],
  ): Promise<void> {
    // Notify eligible donors
    if (eligibleDonorIds.length > 0) {
      await this.notificationsService.notifyBloodRequestToDonors(
        bloodRequestId,
        bloodType,
        location,
        priority,
        eligibleDonorIds,
      );
    }

    // Notify nearby blood banks
    if (nearbyBloodBankIds.length > 0) {
      await this.notificationsService.notifyBloodRequestToBloodBanks(
        bloodRequestId,
        bloodType,
        location,
        priority,
        nearbyBloodBankIds,
      );
    }
  }

  async notifyDonationCompleted(
    donorId: string,
    donationId: string,
    donationDate: Date,
    bloodBankName: string,
  ): Promise<void> {
    // Schedule notification for when results are ready (typically 24-48 hours later)
    const resultReadyDate = new Date(donationDate);
    resultReadyDate.setHours(resultReadyDate.getHours() + 48); // 48 hours later

    await this.notificationsService.notifyDonationResultReady(
      donorId,
      donationId,
      resultReadyDate,
      bloodBankName,
    );
  }

  async scheduleAppointmentReminders(
    donorId: string,
    appointmentId: string,
    appointmentDate: Date,
    bloodBankName: string,
    appointmentTime: string,
  ): Promise<void> {
    // Schedule multiple reminders

    // 24 hours before
    await this.notificationsService.notifyAppointmentReminder(
      donorId,
      appointmentId,
      appointmentDate,
      bloodBankName,
      appointmentTime,
    );

    // You could add more reminders here (e.g., 1 hour before)
    // by creating additional notifications with different scheduledFor dates
  }

  async notifyBloodRequestFulfilled(
    requesterId: string,
    bloodRequestId: string,
    bloodType: string,
    fulfilledBy: string,
  ): Promise<void> {
    await this.notificationsService.notifyBloodRequestFulfilled(
      requesterId,
      bloodRequestId,
      bloodType,
      fulfilledBy,
    );
  }
}
