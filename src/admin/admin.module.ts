import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Donation, DonationSchema } from '../donation/entities/donation.entity';
import { BloodRequest, BloodRequestSchema } from '../blood-request/entities/blood-request.entity';
import { BloodBank, BloodBankSchema } from '../blood-bank/entities/blood-bank.entity';
import { Application, ApplicationSchema } from '../applications/entities/application.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Donation.name, schema: DonationSchema },
      { name: BloodRequest.name, schema: BloodRequestSchema },
      { name: BloodBank.name, schema: BloodBankSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
