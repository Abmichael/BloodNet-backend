import { Module } from '@nestjs/common';
import { DonorService } from './donor.service';
import { DonorController } from './donor.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Donor, DonorSchema } from './entities/donor.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Donor.name, schema: DonorSchema }]),
  ],
  providers: [DonorService],
  controllers: [DonorController],
})
export class DonorModule {}
