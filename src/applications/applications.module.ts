import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application, ApplicationSchema } from './entities/application.entity';
import { UsersModule } from '../users/users.module';
import { BloodBankModule } from '../blood-bank/blood-bank.module';
import { MedicalInstitutionModule } from '../medical-institution/medical-institution.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
    ]),
    UsersModule,
    BloodBankModule,
    MedicalInstitutionModule,
    AdminModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
