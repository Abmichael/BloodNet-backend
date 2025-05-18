import { Module } from '@nestjs/common';
import { BloodBagService } from './blood-bag.service';
import { BloodBagController } from './blood-bag.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { BloodBagSchema } from './entities/blood-bag.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'BloodBag',
        schema: BloodBagSchema,
      },
    ]),
  ],
  controllers: [BloodBagController],
  providers: [BloodBagService],
})
export class BloodBagModule {}
