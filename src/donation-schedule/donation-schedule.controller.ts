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
  Req,
} from '@nestjs/common';
import { DonationScheduleService } from './donation-schedule.service';
import { CreateDonationScheduleDto } from './dto/create-donation-schedule.dto';
import { UpdateDonationScheduleDto } from './dto/update-donation-schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { QueryFilter } from '../common/filters/query/query-filter';
import { ExtendedQueryString } from '../common/filters/query/filter.types';
import { ScheduleStatus } from './entities/donation-schedule.entity';

@Controller('donation-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DonationScheduleController {
  constructor(
    private readonly donationScheduleService: DonationScheduleService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  create(
    @Body() createDonationScheduleDto: CreateDonationScheduleDto,
    @Req() req: any,
  ) {
    // Auto-assign scheduledBy if not provided
    if (!createDonationScheduleDto.scheduledBy) {
      createDonationScheduleDto.scheduledBy = req.user._id;
    }
    return this.donationScheduleService.create(createDonationScheduleDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async findAll(@Query() query: ExtendedQueryString) {
    const baseQuery = this.donationScheduleService.findAll();
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('donor/:donorId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  async findByDonor(
    @Param('donorId') donorId: string,
    @Query() query: ExtendedQueryString,
  ) {
    const baseQuery = this.donationScheduleService.findByDonor(donorId);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('blood-bank/:bloodBankId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async findByBloodBank(
    @Param('bloodBankId') bloodBankId: string,
    @Query() query: ExtendedQueryString,
  ) {
    const baseQuery = this.donationScheduleService.findByBloodBank(bloodBankId);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('date-range')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query() query: ExtendedQueryString,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        statusCode: 400,
        message: 'Invalid date format. Use ISO date strings.',
      };
    }

    const baseQuery = this.donationScheduleService.findByDateRange(start, end);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('status/:status')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async findByStatus(
    @Param('status') status: ScheduleStatus,
    @Query() query: ExtendedQueryString,
  ) {
    const baseQuery = this.donationScheduleService.findByStatus(status);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('upcoming')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  findUpcoming(@Query('hours') hours?: string) {
    const hoursNumber = hours ? parseInt(hours, 10) : 24;
    return this.donationScheduleService.findUpcomingSchedules(hoursNumber);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  getStats(@Query('bloodBankId') bloodBankId?: string) {
    return this.donationScheduleService.getScheduleStats(bloodBankId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  findOne(@Param('id') id: string) {
    return this.donationScheduleService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  update(
    @Param('id') id: string,
    @Body() updateDonationScheduleDto: UpdateDonationScheduleDto,
  ) {
    return this.donationScheduleService.update(id, updateDonationScheduleDto);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  confirm(@Param('id') id: string) {
    return this.donationScheduleService.confirmSchedule(id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.donationScheduleService.cancelSchedule(
      id,
      reason || 'No reason provided',
    );
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  complete(@Param('id') id: string, @Body('donationId') donationId: string) {
    return this.donationScheduleService.completeSchedule(id, donationId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.donationScheduleService.remove(id);
  }
}
