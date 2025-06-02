import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/role.guard';
import { DonorModule } from './donor/donor.module';
import { BloodBankModule } from './blood-bank/blood-bank.module';
import { DonationModule } from './donation/donation.module';
import { MedicalInstitutionModule } from './medical-institution/medical-institution.module';
import { BloodRequestModule } from './blood-request/blood-request.module';
import { ApplicationsModule } from './applications/applications.module';
import { DonationScheduleModule } from './donation-schedule/donation-schedule.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/bloodnet',
    ),
    AuthModule,
    UsersModule,
    DonorModule,
    BloodBankModule,
    DonationModule,
    MedicalInstitutionModule,
    BloodRequestModule,
    ApplicationsModule,
    DonationScheduleModule,
    NotificationsModule,
    AdminModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
