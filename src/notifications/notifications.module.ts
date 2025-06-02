import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationHelperService } from './notification-helper.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import {
  Notification,
  NotificationSchema,
} from './entities/notification.entity';
import {
  NotificationPreferences,
  NotificationPreferencesSchema,
} from './entities/notification-preferences.entity';
import {
  EmailNotificationService,
  SmsNotificationService,
  PushNotificationService,
  NotificationDeliveryService,
  NotificationPreferencesService,
} from './services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      {
        name: NotificationPreferences.name,
        schema: NotificationPreferencesSchema,
      },
    ]),
    ScheduleModule.forRoot(), // For cron jobs
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationHelperService,
    EmailNotificationService,
    SmsNotificationService,
    PushNotificationService,
    NotificationDeliveryService,
    NotificationPreferencesService,
  ],
  exports: [
    NotificationsService,
    NotificationHelperService,
    NotificationDeliveryService,
    NotificationPreferencesService,
  ], // Export services
})
export class NotificationsModule {}
