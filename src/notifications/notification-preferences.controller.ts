import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import {
  NotificationPreferencesService,
  UpdateNotificationPreferencesDto,
} from './services';

@Controller('notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  /**
   * Get notification preferences for the current user
   */
  @Get()
  async getMyPreferences(@Request() req) {
    return this.preferencesService.getPreferences(req.user._id, req.user.role);
  }

  /**
   * Update notification preferences for the current user
   */
  @Post()
  async updateMyPreferences(
    @Request() req,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(
      req.user._id,
      req.user.role,
      updateDto,
    );
  }

  /**
   * Get notification preferences for a specific donor
   * Admin-only endpoint
   */
  @Get('donor/:id')
  @Roles(UserRole.ADMIN)
  async getDonorPreferences(@Param('id') id: string) {
    return this.preferencesService.getPreferences(id, 'donor');
  }

  /**
   * Get notification preferences for a specific blood bank
   * Admin-only endpoint
   */
  @Get('blood-bank/:id')
  @Roles(UserRole.ADMIN)
  async getBloodBankPreferences(@Param('id') id: string) {
    return this.preferencesService.getPreferences(id, 'blood_bank');
  }

  /**
   * Get notification preferences for a specific medical institution
   * Admin-only endpoint
   */
  @Get('medical-institution/:id')
  @Roles(UserRole.ADMIN)
  async getMedicalInstitutionPreferences(@Param('id') id: string) {
    return this.preferencesService.getPreferences(id, 'medical_institution');
  }

  /**
   * Update notification preferences for a specific user
   * Admin-only endpoint
   */
  @Post(':userType/:id')
  @Roles(UserRole.ADMIN)
  async updateUserPreferences(
    @Param('userType') userType: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(id, userType, updateDto);
  }
}
