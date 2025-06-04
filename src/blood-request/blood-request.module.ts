import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BloodRequestService } from './blood-request.service';
import { BloodRequestController } from './blood-request.controller';
import {
  BloodRequest,
  BloodRequestSchema,
} from './entities/blood-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DonorModule } from '../donor/donor.module';
import { BloodBankModule } from '../blood-bank/blood-bank.module';
import { AdminModule } from '../admin/admin.module';
import { DonationModule } from '../donation/donation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BloodRequest.name, schema: BloodRequestSchema },
    ]),
    NotificationsModule,
    DonorModule,
    BloodBankModule,
    AdminModule,
    forwardRef(() => DonationModule),
  ],
  controllers: [BloodRequestController],
  providers: [BloodRequestService],
  exports: [BloodRequestService],
})
export class BloodRequestModule {}
