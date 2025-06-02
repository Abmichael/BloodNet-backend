import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BloodRequest.name, schema: BloodRequestSchema },
    ]),
    NotificationsModule,
    DonorModule,
    BloodBankModule,
  ],
  controllers: [BloodRequestController],
  providers: [BloodRequestService],
  exports: [BloodRequestService],
})
export class BloodRequestModule {}
