import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Put,
} from '@nestjs/common';
import {
  UpdateBloodUnitStatusDto,
  DispatchBloodUnitDto,
  UseBloodUnitDto,
  DiscardBloodUnitDto,
  AutoFulfillBloodRequestDto,
} from './dto/update-blood-unit-status.dto';
import { DonationService } from './donation.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { QueryFilter } from '../common/filters/query/query-filter';
import { ExtendedQueryString } from '../common/filters/query/filter.types';
import { BloodUnitStatus } from './donation.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('donations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  create(
    @Body() createDonationDto: CreateDonationDto,
    @CurrentUser() user: any,
  ) {
    return this.donationService.create(createDonationDto, user);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MEDICAL_INSTITUTION,
    UserRole.BLOOD_BANK,
    UserRole.DONOR,
  )
  async findAll(@Query() query: ExtendedQueryString, @CurrentUser() user: any) {
    const baseQuery = this.donationService.findAll(user);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Get('donor/:donorId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  async findAllByDonor(
    @Param('donorId') donorId: string,
    @Query() query: ExtendedQueryString,
    @CurrentUser() user: any,
  ) {
    await this.donationService.assertDonorExists(donorId, user); // Ensure donor exists and user has access
    const baseQuery = this.donationService.findAllByDonorQuery(donorId, user);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Get('donor/:donorId/stats')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  getDonorStats(@Param('donorId') donorId: string, @CurrentUser() user: any) {
    return this.donationService.getDonorStats(donorId, user);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MEDICAL_INSTITUTION,
    UserRole.DONOR,
    UserRole.BLOOD_BANK,
  )
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.donationService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MEDICAL_INSTITUTION,
    UserRole.DONOR,
    UserRole.BLOOD_BANK,
  )
  update(
    @Param('id') id: string,
    @Body() updateDonationDto: UpdateDonationDto,
    @CurrentUser() user: any,
  ) {
    return this.donationService.update(id, updateDonationDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.donationService.remove(id, user);
  }

  // Blood Unit Status Management Endpoints

  @Get('/blood-units/status/:status')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  async getBloodUnitsByStatus(
    @Param('status') status: BloodUnitStatus,
    @Query() query: ExtendedQueryString,
    @CurrentUser() user: any,
  ) {
    const baseQuery = this.donationService.getBloodUnitsByStatus(status, user);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Get('blood-units/expired')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  async getExpiredBloodUnits(
    @Query() query: ExtendedQueryString,
    @CurrentUser() user: any,
  ) {
    const baseQuery = this.donationService.getExpiredBloodUnits(user);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Get('blood-units/expiring-soon')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  async getBloodUnitsExpiringSoon(
    @Query() query: ExtendedQueryString,
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    const daysParam = days ? parseInt(days, 10) : 3;
    const baseQuery = this.donationService.getBloodUnitsExpiringSoon(
      daysParam,
      user,
    );
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Post('blood-units/process-expired')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  processExpiredBloodUnits(@CurrentUser() user: any) {
    return this.donationService.processExpiredBloodUnits(user);
  }

  @Get(':id/tracking')
  @Roles(
    UserRole.ADMIN,
    UserRole.MEDICAL_INSTITUTION,
    UserRole.DONOR,
    UserRole.BLOOD_BANK,
  )
  getBloodUnitTrackingInfo(@Param('id') id: string, @CurrentUser() user: any) {
    return this.donationService.getBloodUnitTrackingInfo(id, user);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  updateBloodUnitStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateBloodUnitStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.donationService.updateBloodUnitStatus(id, updateDto, user);
  }

  @Put(':id/dispatch')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  dispatchBloodUnit(
    @Param('id') id: string,
    @Body() dispatchDto: DispatchBloodUnitDto,
    @CurrentUser() user: any,
  ) {
    return this.donationService.markAsDispatched(id, dispatchDto, user);
  }

  @Put(':id/use')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  useBloodUnit(
    @Param('id') id: string,
    @Body() useDto: UseBloodUnitDto,
    @CurrentUser() user: any,
  ) {
    return this.donationService.markAsUsed(id, useDto, user);
  }

  @Put(':id/discard')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  discardBloodUnit(
    @Param('id') id: string,
    @Body() discardDto: DiscardBloodUnitDto,
    @CurrentUser() user: any,
  ) {
    return this.donationService.markAsDiscarded(id, discardDto, user);
  }

  @Put(':id/expire')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  expireBloodUnit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.donationService.markAsExpired(id, user);
  }

  @Put(':id/reserve/:requestId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK)
  reserveBloodUnit(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.donationService.reserveForRequest(id, requestId, user);
  }

  // Blood Request Integration Endpoints

  @Get('suitable-units/:bloodType/:rhFactor/:unitsNeeded')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  findSuitableBloodUnits(
    @Param('bloodType') bloodType: string,
    @Param('rhFactor') rhFactor: string,
    @Param('unitsNeeded') unitsNeeded: string,
    @CurrentUser() user: any,
    @Query('bloodBankId') bloodBankId?: string,
  ) {
    const units = parseInt(unitsNeeded, 10);
    return this.donationService.findSuitableBloodUnitsForRequest(
      bloodType,
      rhFactor,
      units,
      bloodBankId,
      user,
    );
  }

  @Post('auto-fulfill-request/:requestId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  autoFulfillBloodRequest(
    @Param('requestId') requestId: string,
    @Body() autoFulfillDto: AutoFulfillBloodRequestDto,
    @CurrentUser() user: any,
  ) {
    const unitsNeeded = parseInt(autoFulfillDto.unitsNeeded, 10);
    return this.donationService.autoFulfillBloodRequest(
      requestId,
      autoFulfillDto.bloodType,
      autoFulfillDto.rhFactor,
      unitsNeeded,
      autoFulfillDto.bloodBankId,
      user,
    );
  }

  @Post('reserve-multiple-units/:requestId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  reserveMultipleUnits(
    @Param('requestId') requestId: string,
    @Body() body: { donationIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.donationService.reserveBloodUnitsForRequest(
      body.donationIds,
      requestId,
      user,
    );
  }
}
