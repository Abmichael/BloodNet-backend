import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Notification,
  NotificationDocument,
  NotificationType,
  NotificationStatus,
  RecipientType,
} from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import {
  NOTIFICATION_MESSAGES,
  NOTIFICATION_SETTINGS,
  URGENT_PRIORITIES,
} from './notifications.constants';
import {
  NotificationDeliveryService,
  ExternalNotificationData,
  RecipientContactInfo,
  NotificationPreferencesService,
} from './services';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private notificationDeliveryService: NotificationDeliveryService,
    private notificationPreferencesService: NotificationPreferencesService,
    private adminService: AdminService,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = new this.notificationModel(createNotificationDto);
    const savedNotification = await notification.save();

    // Log notification creation activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.NOTIFICATION_SENT,
        title: 'Notification Created',
        description: `Notification "${savedNotification.title}" created for ${savedNotification.recipientType}`,
        userId: savedNotification.recipientId.toString(),
        metadata: {
          notificationId: (savedNotification as any)._id.toString(),
          notificationType: savedNotification.type,
          recipientType: savedNotification.recipientType,
          recipientId: savedNotification.recipientId.toString(),
          title: savedNotification.title,
          relatedEntityType: savedNotification.relatedEntityType,
          relatedEntityId: savedNotification.relatedEntityId?.toString(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log notification creation activity:', error);
    }

    return savedNotification;
  }

  async findAll(query: GetNotificationsQueryDto = {}): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      recipientType,
      fromDate,
      toDate,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (recipientType) filter.recipientType = recipientType;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findByRecipient(
    recipientId: string,
    query: GetNotificationsQueryDto = {},
  ) {
    const { type, status } = query;

    const filter: any = { recipientId: new Types.ObjectId(recipientId) };
    if (type) filter.type = type;
    if (status) filter.status = status;

    return this.notificationModel.find(filter);
  }
  async findOne(id: string): Promise<Notification | null> {
    return this.notificationModel.findById(id).exec();
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification | null> {
    return this.notificationModel
      .findByIdAndUpdate(id, updateNotificationDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<void> {
    await this.notificationModel.findByIdAndDelete(id).exec();
  }
  async markAsRead(id: string): Promise<Notification | null> {
    return this.notificationModel
      .findByIdAndUpdate(
        id,
        {
          status: NotificationStatus.READ,
          readAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await this.notificationModel
      .updateMany(
        {
          recipientId: new Types.ObjectId(recipientId),
          status: { $ne: NotificationStatus.READ },
        },
        {
          status: NotificationStatus.READ,
          readAt: new Date(),
        },
      )
      .exec();
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({
        recipientId: new Types.ObjectId(recipientId),
        status: { $ne: NotificationStatus.READ },
      })
      .exec();
  }
  // Notification creation methods for specific use cases
  async notifyBloodRequestToDonors(
    bloodRequestId: string,
    bloodType: string,
    location: string,
    priority: string,
    donorIds: string[],
  ): Promise<void> {
    const isUrgent = URGENT_PRIORITIES.includes(priority as any);
    const type = isUrgent
      ? NotificationType.BLOOD_REQUEST_URGENT
      : NotificationType.BLOOD_REQUEST_NEW;

    const messageTemplate = isUrgent
      ? NOTIFICATION_MESSAGES.BLOOD_REQUEST.URGENT
      : NOTIFICATION_MESSAGES.BLOOD_REQUEST.NEW;

    const title = messageTemplate.TITLE(bloodType);
    const message = messageTemplate.MESSAGE(bloodType, location);

    const notifications = donorIds.map((donorId) => ({
      type,
      recipientType: RecipientType.DONOR,
      recipientId: donorId,
      recipientModel: 'Donor',
      title,
      message,
      data: {
        bloodRequestId,
        bloodType,
        location,
        priority,
        isUrgent,
      },
      relatedEntityId: bloodRequestId,
      relatedEntityType: 'BloodRequest',
    }));

    const insertedNotifications = await this.notificationModel.insertMany(notifications);
    this.logger.log(
      `Created ${notifications.length} blood request notifications for donors`,
    );

    // Log bulk notification activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.NOTIFICATION_SENT,
        title: 'Blood Request Notifications Sent to Donors',
        description: `${notifications.length} ${isUrgent ? 'urgent' : 'standard'} blood request notifications sent for ${bloodType} blood`,
        metadata: {
          bloodRequestId,
          bloodType,
          location,
          priority,
          isUrgent,
          recipientCount: donorIds.length,
          donorIds,
          notificationIds: insertedNotifications.map(n => (n as any)._id.toString()),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log blood request notifications activity:', error);
    }
  }

  async notifyBloodRequestToBloodBanks(
    bloodRequestId: string,
    bloodType: string,
    location: string,
    priority: string,
    bloodBankIds: string[],
  ): Promise<void> {
    const isUrgent = priority === 'critical' || priority === 'high';
    const type = isUrgent
      ? NotificationType.BLOOD_REQUEST_URGENT
      : NotificationType.BLOOD_REQUEST_NEW;

    const title = isUrgent
      ? `🚨 Urgent Blood Request - ${bloodType}`
      : `New Blood Request - ${bloodType}`;

    const message = `Blood type ${bloodType} is needed${isUrgent ? ' urgently' : ''} at ${location}. Please check your inventory.`;

    const notifications = bloodBankIds.map((bloodBankId) => ({
      type,
      recipientType: RecipientType.BLOOD_BANK,
      recipientId: bloodBankId,
      recipientModel: 'BloodBank',
      title,
      message,
      data: {
        bloodRequestId,
        bloodType,
        location,
        priority,
        isUrgent,
      },
      relatedEntityId: bloodRequestId,
      relatedEntityType: 'BloodRequest',
    }));

    const insertedNotifications = await this.notificationModel.insertMany(notifications);
    this.logger.log(
      `Created ${notifications.length} blood request notifications for blood banks`,
    );

    // Log bulk notification activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.NOTIFICATION_SENT,
        title: 'Blood Request Notifications Sent to Blood Banks',
        description: `${notifications.length} ${isUrgent ? 'urgent' : 'standard'} blood request notifications sent for ${bloodType} blood`,
        metadata: {
          bloodRequestId,
          bloodType,
          location,
          priority,
          isUrgent,
          recipientCount: bloodBankIds.length,
          bloodBankIds,
          notificationIds: insertedNotifications.map(n => (n as any)._id.toString()),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log blood bank notifications activity:', error);
    }
  }

  async notifyDonationResultReady(
    donorId: string,
    donationId: string,
    donationDate: Date,
    bloodBankName: string,
  ): Promise<void> {
    const notification = {
      type: NotificationType.DONATION_RESULT_READY,
      recipientType: RecipientType.DONOR,
      recipientId: donorId,
      recipientModel: 'Donor',
      title: '🩸 Your Donation Results Are Ready',
      message: `Your test results from your donation on ${donationDate.toLocaleDateString()} are ready. Please visit ${bloodBankName} to collect your results.`,
      data: {
        donationId,
        donationDate: donationDate.toISOString(),
        bloodBankName,
        requiresInPersonVisit: true,
      },
      relatedEntityId: donationId,
      relatedEntityType: 'Donation',
    };

    const createdNotification = await this.create(notification);
    this.logger.log(
      `Created donation result notification for donor ${donorId}`,
    );

    // Log specific donation result notification activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.NOTIFICATION_SENT,
        title: 'Donation Result Notification Sent',
        description: `Donation result notification sent to donor for donation on ${donationDate.toLocaleDateString()}`,
        userId: donorId,
        metadata: {
          notificationId: (createdNotification as any)._id.toString(),
          donorId,
          donationId,
          donationDate: donationDate.toISOString(),
          bloodBankName,
          requiresInPersonVisit: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log donation result notification activity:', error);
    }
  }

  async notifyBloodRequestFulfilled(
    requesterId: string,
    bloodRequestId: string,
    bloodType: string,
    fulfilledBy: string,
  ): Promise<void> {
    const notification = {
      type: NotificationType.BLOOD_REQUEST_FULFILLED,
      recipientType: RecipientType.MEDICAL_INSTITUTION,
      recipientId: requesterId,
      recipientModel: 'User',
      title: '✅ Blood Request Fulfilled',
      message: `Your blood request for ${bloodType} has been fulfilled by ${fulfilledBy}.`,
      data: {
        bloodRequestId,
        bloodType,
        fulfilledBy,
      },
      relatedEntityId: bloodRequestId,
      relatedEntityType: 'BloodRequest',
    };

    const createdNotification = await this.create(notification);
    this.logger.log(
      `Created blood request fulfilled notification for requester ${requesterId}`,
    );

    // Log blood request fulfillment notification activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.BLOOD_REQUEST_FULFILLED,
        title: 'Blood Request Fulfillment Notification Sent',
        description: `Blood request fulfillment notification sent for ${bloodType} blood request`,
        userId: requesterId,
        metadata: {
          notificationId: (createdNotification as any)._id.toString(),
          requesterId,
          bloodRequestId,
          bloodType,
          fulfilledBy,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log blood request fulfillment notification activity:', error);
    }
  }
  async notifyAppointmentReminder(
    donorId: string,
    appointmentId: string,
    appointmentDate: Date,
    bloodBankName: string,
    appointmentTime: string,
  ): Promise<void> {
    const scheduledDate = new Date(
      appointmentDate.getTime() - 24 * 60 * 60 * 1000,
    ); // 24 hours before

    const notification = {
      type: NotificationType.DONATION_APPOINTMENT_REMINDER,
      recipientType: RecipientType.DONOR,
      recipientId: donorId,
      recipientModel: 'Donor',
      title: '📅 Donation Appointment Reminder',
      message: `Don't forget your blood donation appointment tomorrow at ${appointmentTime} at ${bloodBankName}.`,
      data: {
        appointmentId,
        appointmentDate: appointmentDate.toISOString(),
        appointmentTime,
        bloodBankName,
      },
      scheduledFor: scheduledDate.toISOString(),
      relatedEntityId: appointmentId,
      relatedEntityType: 'DonationSchedule',
    };

    const createdNotification = await this.create(notification);
    this.logger.log(
      `Created appointment reminder notification for donor ${donorId}`,
    );

    // Log appointment reminder notification activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.NOTIFICATION_SENT,
        title: 'Appointment Reminder Notification Created',
        description: `Appointment reminder notification scheduled for donation appointment at ${bloodBankName}`,
        userId: donorId,
        metadata: {
          notificationId: (createdNotification as any)._id.toString(),
          donorId,
          appointmentId,
          appointmentDate: appointmentDate.toISOString(),
          appointmentTime,
          bloodBankName,
          scheduledFor: scheduledDate.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log appointment reminder notification activity:', error);
    }
  }

  // Process scheduled notifications (run every hour)
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await this.notificationModel
        .find({
          status: NotificationStatus.PENDING,
          scheduledFor: { $lte: new Date() },
        })
        .exec();

      for (const notification of scheduledNotifications) {
        try {
          // Here you would integrate with your actual notification service
          // (email, SMS, push notifications, etc.)
          await this.sendNotification(notification);

          notification.status = NotificationStatus.SENT;
          notification.sentAt = new Date();
          await notification.save();

          this.logger.log(`Sent scheduled notification ${notification._id}`);
        } catch (error) {
          notification.retryCount += 1;
          notification.errorMessage = error.message;

          if (notification.retryCount >= NOTIFICATION_SETTINGS.MAX_RETRIES) {
            notification.status = NotificationStatus.FAILED;
            this.logger.error(
              `Failed to send notification ${notification._id} after ${NOTIFICATION_SETTINGS.MAX_RETRIES} retries`,
            );
          }

          await notification.save();
        }
      }
    } catch (error) {
      this.logger.error('Error processing scheduled notifications:', error);
    }
  }
  private async sendNotification(
    notification: NotificationDocument,
  ): Promise<void> {
    // First update notification status
    this.logger.log(
      `Sending notification: ${notification.title} to ${notification.recipientId}`,
    );

    // Mark as sent in the database
    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    await notification.save();

    // Log notification delivery activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.NOTIFICATION_SENT,
        title: 'Notification Delivered',
        description: `Notification "${notification.title}" successfully delivered to ${notification.recipientType}`,
        userId: notification.recipientId.toString(),
        metadata: {
          notificationId: (notification as any)._id.toString(),
          notificationType: notification.type,
          recipientType: notification.recipientType,
          recipientId: notification.recipientId.toString(),
          title: notification.title,
          sentAt: notification.sentAt.toISOString(),
          deliveryStatus: 'sent',
        },
      });
    } catch (error) {
      this.logger.error('Failed to log notification delivery activity:', error);
    }

    // Try to deliver through external channels if available
    try {
      // Get recipient's contact info (this would need to be implemented based on your data model)
      const recipientInfo = await this.getRecipientContactInfo(
        notification.recipientId.toString(),
        notification.recipientType,
        notification.recipientModel,
      );

      if (
        recipientInfo &&
        this.notificationDeliveryService.hasConfiguredServices()
      ) {
        // Prepare notification data for external delivery
        const externalNotification: ExternalNotificationData = {
          title: notification.title,
          message: notification.message,
          recipientId: notification.recipientId.toString(),
          recipientType: notification.recipientType,
          type: notification.type,
          data: notification.data,
        };

        // Send through all configured channels
        const deliveryResults =
          await this.notificationDeliveryService.deliverNotification(
            externalNotification,
            recipientInfo,
          );

        // Log delivery results
        this.logger.log(
          `External delivery results for ${notification._id}: ${JSON.stringify(deliveryResults)}`,
        );

        // Log external delivery activity
        try {
          await this.adminService.logActivity({
            activityType: ActivityType.NOTIFICATION_SENT,
            title: 'External Notification Delivery Attempted',
            description: `External delivery attempted for notification "${notification.title}"`,
            userId: notification.recipientId.toString(),
            metadata: {
              notificationId: (notification as any)._id.toString(),
              deliveryResults,
              externalChannels: Object.keys(deliveryResults),
            },
          });
        } catch (error) {
          this.logger.error('Failed to log external delivery activity:', error);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error sending notification through external channels: ${error.message}`,
        error.stack,
      );
      // Don't mark as failed if only external delivery fails
      // The in-app notification is still considered sent
    }
  }
  /**
   * Get recipient contact information and preferences from database
   */
  private async getRecipientContactInfo(
    recipientId: string,
    recipientType: RecipientType,
    recipientModel: string,
  ): Promise<RecipientContactInfo | null> {
    try {
      // Convert recipient type to user type format used in preferences
      let userType: string;
      switch (recipientType) {
        case RecipientType.DONOR:
          userType = 'donor';
          break;
        case RecipientType.BLOOD_BANK:
          userType = 'blood_bank';
          break;
        case RecipientType.MEDICAL_INSTITUTION:
          userType = 'medical_institution';
          break;
        default:
          userType = 'admin';
      }

      // Get user's notification preferences
      const preferences =
        await this.notificationPreferencesService.getPreferences(
          recipientId,
          userType,
        );

      // Check if the user has provided preferred contact information
      const contactInfo: RecipientContactInfo = {
        preferences: {
          emailEnabled: preferences.emailEnabled,
          smsEnabled: preferences.smsEnabled,
          pushEnabled: preferences.pushEnabled,
        },
      };

      // Use preferred contact info if available, otherwise query the appropriate model
      if (preferences.preferredEmail) {
        contactInfo.email = preferences.preferredEmail;
      } else if (recipientModel) {
        // In a production app, you would query the appropriate model here
        // For now, use placeholder emails based on ID for demonstration
        contactInfo.email = `${userType}-${recipientId.substring(0, 5)}@example.com`;
      }

      if (preferences.preferredPhone) {
        contactInfo.phoneNumber = preferences.preferredPhone;
      } else if (recipientModel) {
        // In a production app, query the appropriate model
        // Placeholder for now
        contactInfo.phoneNumber = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;
      }

      if (preferences.deviceToken) {
        contactInfo.deviceToken = preferences.deviceToken;
      }

      return contactInfo;
    } catch (error) {
      this.logger.error(`Error fetching recipient info: ${error.message}`);
      return null;
    }
  }
  // Cleanup old notifications (run daily)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldNotifications(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - NOTIFICATION_SETTINGS.CLEANUP_AFTER_DAYS,
      );

      const result = await this.notificationModel
        .deleteMany({
          createdAt: { $lt: cutoffDate },
          status: { $in: [NotificationStatus.READ, NotificationStatus.FAILED] },
        })
        .exec();

      this.logger.log(`Cleaned up ${result.deletedCount} old notifications`);
    } catch (error) {
      this.logger.error('Error cleaning up old notifications:', error);
    }
  }
}
