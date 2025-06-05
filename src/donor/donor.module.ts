import { Module, forwardRef } from '@nestjs/common';
import { DonorService } from './donor.service';
import { DonorController } from './donor.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Donor, DonorSchema } from './entities/donor.entity';
import { DonationModule } from '../donation/donation.module';
import { AdminModule } from '../admin/admin.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Donor.name, schema: DonorSchema }]),
    forwardRef(() => DonationModule), // Use forwardRef to handle circular dependency
    AdminModule,
    UsersModule,
  ],
  providers: [DonorService],
  controllers: [DonorController],
  exports: [DonorService], // Export DonorService to be used in other modules
})
export class DonorModule {}
