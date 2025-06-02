import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { QueryFilter } from 'src/common/filters/query';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return {
      success: true,
      data: await this.notificationsService.create(createNotificationDto),
      message: 'Notification created successfully',
    };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: GetNotificationsQueryDto) {
    const result = await this.notificationsService.findAll(query);
    return {
      success: true,
      data: result.notifications,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      message: 'Notifications retrieved successfully',
    };
  }

  @Get('my-notifications')
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query() query: GetNotificationsQueryDto,
  ) {
    // For donors, we need to find their donor profile ID
    // For blood banks and medical institutions, we use their user ID
    const recipientId = user.id;

    // TODO: If user is a donor, you might need to fetch their donor profile ID
    // This depends on your user-donor relationship structure

    const baseQuery = this.notificationsService.findByRecipient(
      recipientId,
      query,
    );
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    const recipientId = user.id;

    // TODO: If user is a donor, you might need to fetch their donor profile ID

    const count = await this.notificationsService.getUnreadCount(recipientId);
    return {
      success: true,
      data: { unreadCount: count },
      message: 'Unread count retrieved successfully',
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const notification = await this.notificationsService.findOne(id);
    return {
      success: true,
      data: notification,
      message: 'Notification retrieved successfully',
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return {
      success: true,
      data: await this.notificationsService.update(id, updateNotificationDto),
      message: 'Notification updated successfully',
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    // TODO: Add authorization check to ensure user can only mark their own notifications as read

    return {
      success: true,
      data: await this.notificationsService.markAsRead(id),
      message: 'Notification marked as read',
    };
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: any) {
    const recipientId = user.id;

    // TODO: If user is a donor, you might need to fetch their donor profile ID

    await this.notificationsService.markAllAsRead(recipientId);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.notificationsService.remove(id);
    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  // Special endpoints for creating specific notification types
  @Post('blood-request-to-donors')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async notifyBloodRequestToDonors(
    @Body()
    body: {
      bloodRequestId: string;
      bloodType: string;
      location: string;
      priority: string;
      donorIds: string[];
    },
  ) {
    await this.notificationsService.notifyBloodRequestToDonors(
      body.bloodRequestId,
      body.bloodType,
      body.location,
      body.priority,
      body.donorIds,
    );

    return {
      success: true,
      message: `Blood request notifications sent to ${body.donorIds.length} donors`,
    };
  }

  @Post('blood-request-to-blood-banks')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async notifyBloodRequestToBloodBanks(
    @Body()
    body: {
      bloodRequestId: string;
      bloodType: string;
      location: string;
      priority: string;
      bloodBankIds: string[];
    },
  ) {
    await this.notificationsService.notifyBloodRequestToBloodBanks(
      body.bloodRequestId,
      body.bloodType,
      body.location,
      body.priority,
      body.bloodBankIds,
    );

    return {
      success: true,
      message: `Blood request notifications sent to ${body.bloodBankIds.length} blood banks`,
    };
  }

  @Post('donation-result-ready')
  @Roles(UserRole.ADMIN, UserRole.BLOOD_BANK)
  async notifyDonationResultReady(
    @Body()
    body: {
      donorId: string;
      donationId: string;
      donationDate: string;
      bloodBankName: string;
    },
  ) {
    await this.notificationsService.notifyDonationResultReady(
      body.donorId,
      body.donationId,
      new Date(body.donationDate),
      body.bloodBankName,
    );

    return {
      success: true,
      message: 'Donation result notification sent to donor',
    };
  }

  @Post('appointment-reminder')
  @Roles(UserRole.ADMIN, UserRole.BLOOD_BANK)
  async scheduleAppointmentReminder(
    @Body()
    body: {
      donorId: string;
      appointmentId: string;
      appointmentDate: string;
      bloodBankName: string;
      appointmentTime: string;
    },
  ) {
    await this.notificationsService.notifyAppointmentReminder(
      body.donorId,
      body.appointmentId,
      new Date(body.appointmentDate),
      body.bloodBankName,
      body.appointmentTime,
    );

    return {
      success: true,
      message: 'Appointment reminder scheduled',
    };
  }
}
