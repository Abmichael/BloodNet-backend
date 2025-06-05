import { Module } from '@nestjs/common';
import { BloodBankService } from './blood-bank.service';
import { BloodBankController } from './blood-bank.controller';
import { BloodBank, BloodBankSchema } from './entities/blood-bank.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminModule } from '../admin/admin.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BloodBank.name, schema: BloodBankSchema },
    ]),
    AdminModule,
    UsersModule,
  ],
  controllers: [BloodBankController],
  providers: [BloodBankService],
  exports: [BloodBankService],
})
export class BloodBankModule {}
