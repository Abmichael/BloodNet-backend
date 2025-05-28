import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BloodRequestService } from './blood-request.service';
import { BloodRequestController } from './blood-request.controller';
import { BloodRequest, BloodRequestSchema } from './entities/blood-request.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BloodRequest.name, schema: BloodRequestSchema },
    ]),
  ],
  controllers: [BloodRequestController],
  providers: [BloodRequestService],
  exports: [BloodRequestService],
})
export class BloodRequestModule {}
