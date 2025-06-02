import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DonationScheduleService } from './donation-schedule.service';
import { DonationScheduleController } from './donation-schedule.controller';
import {
  DonationSchedule,
  DonationScheduleSchema,
} from './entities/donation-schedule.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BloodBankModule } from '../blood-bank/blood-bank.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DonationSchedule.name, schema: DonationScheduleSchema },
    ]),
    NotificationsModule,
    BloodBankModule,
  ],
  controllers: [DonationScheduleController],
  providers: [DonationScheduleService],
  exports: [DonationScheduleService],
})
export class DonationScheduleModule {}
