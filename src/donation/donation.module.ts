import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { DonationService } from './donation.service';
import { DonationController } from './donation.controller';
import { BloodUnitSchedulerService } from './blood-unit-scheduler.service';
import { Donation, DonationSchema } from './entities/donation.entity';
import { DonorModule } from '../donor/donor.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BloodBankModule } from '../blood-bank/blood-bank.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
    ]),
    ScheduleModule.forRoot(), // For cron jobs
    forwardRef(() => DonorModule), // Use forwardRef to handle circular dependency
    NotificationsModule,
    BloodBankModule,
    forwardRef(() => AdminModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [DonationController],
  providers: [DonationService, BloodUnitSchedulerService],
  exports: [DonationService], // Export the service to be used in other modules
})
export class DonationModule {}
