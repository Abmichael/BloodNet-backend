import { Module } from '@nestjs/common';
import { BloodBankService } from './blood-bank.service';
import { BloodBankController } from './blood-bank.controller';
import { BloodBank, BloodBankSchema } from './entities/blood-bank.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BloodBank.name, schema: BloodBankSchema },
    ]),
  ],
  controllers: [BloodBankController],
  providers: [BloodBankService],
})
export class BloodBankModule {}
