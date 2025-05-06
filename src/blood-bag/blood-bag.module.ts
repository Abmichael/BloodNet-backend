import { Module } from '@nestjs/common';
import { BloodBagService } from './blood-bag.service';
import { BloodBagController } from './blood-bag.controller';

@Module({
  controllers: [BloodBagController],
  providers: [BloodBagService],
})
export class BloodBagModule {}
