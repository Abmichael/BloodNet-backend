import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicalInstitutionService } from './medical-institution.service';
import { MedicalInstitutionController } from './medical-institution.controller';
import {
  MedicalInstitution,
  MedicalInstitutionSchema,
} from './entities/medical-institution.entity';
import { AdminModule } from '../admin/admin.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MedicalInstitution.name, schema: MedicalInstitutionSchema },
    ]),
    AdminModule,
    UsersModule,
  ],
  controllers: [MedicalInstitutionController],
  providers: [MedicalInstitutionService],
  exports: [MedicalInstitutionService],
})
export class MedicalInstitutionModule {}
