import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DonationService } from './donation.service';
import { DonationController } from './donation.controller';
import { Donation, DonationSchema } from './entities/donation.entity';
import { DonorModule } from '../donor/donor.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BloodBankModule } from '../blood-bank/blood-bank.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
    ]),
    forwardRef(() => DonorModule), // Use forwardRef to handle circular dependency
    NotificationsModule,
    BloodBankModule,
  ],
  controllers: [DonationController],
  providers: [DonationService],
  exports: [DonationService], // Export the service to be used in other modules
})
export class DonationModule {}
