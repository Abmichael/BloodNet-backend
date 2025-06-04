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

@Controller('donations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  create(@Body() createDonationDto: CreateDonationDto) {
    return this.donationService.create(createDonationDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async findAll(@Query() query: ExtendedQueryString) {
    const baseQuery = this.donationService.findAll();
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
  ) {
    await this.donationService.assertDonorExists(donorId); // Ensure donor exists
    const baseQuery = this.donationService.findAllByDonorQuery(donorId);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Get('donor/:donorId/stats')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  getDonorStats(@Param('donorId') donorId: string) {
    return this.donationService.getDonorStats(donorId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  findOne(@Param('id') id: string) {
    return this.donationService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  update(
    @Param('id') id: string,
    @Body() updateDonationDto: UpdateDonationDto,
  ) {
    return this.donationService.update(id, updateDonationDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.donationService.remove(id);
  }

  // Blood Unit Status Management Endpoints

  @Get('/blood-units/status/:status')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async getBloodUnitsByStatus(
    @Param('status') status: BloodUnitStatus,
    @Query() query: ExtendedQueryString,
  ) {
    const baseQuery = this.donationService.getBloodUnitsByStatus(status);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Get('blood-units/expired')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async getExpiredBloodUnits(@Query() query: ExtendedQueryString) {
    const baseQuery = this.donationService.getExpiredBloodUnits();
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Get('blood-units/expiring-soon')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  async getBloodUnitsExpiringSoon(
    @Query() query: ExtendedQueryString,
    @Query('days') days?: string,
  ) {
    const daysParam = days ? parseInt(days, 10) : 3;
    const baseQuery = this.donationService.getBloodUnitsExpiringSoon(daysParam);
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Post('blood-units/process-expired')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  processExpiredBloodUnits() {
    return this.donationService.processExpiredBloodUnits();
  }

  @Get(':id/tracking')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  getBloodUnitTrackingInfo(@Param('id') id: string) {
    return this.donationService.getBloodUnitTrackingInfo(id);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  updateBloodUnitStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateBloodUnitStatusDto,
  ) {
    return this.donationService.updateBloodUnitStatus(id, updateDto);
  }

  @Put(':id/dispatch')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  dispatchBloodUnit(
    @Param('id') id: string,
    @Body() dispatchDto: DispatchBloodUnitDto,
  ) {
    return this.donationService.markAsDispatched(id, dispatchDto);
  }

  @Put(':id/use')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  useBloodUnit(@Param('id') id: string, @Body() useDto: UseBloodUnitDto) {
    return this.donationService.markAsUsed(id, useDto);
  }

  @Put(':id/discard')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  discardBloodUnit(
    @Param('id') id: string,
    @Body() discardDto: DiscardBloodUnitDto,
  ) {
    return this.donationService.markAsDiscarded(id, discardDto);
  }

  @Put(':id/expire')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  expireBloodUnit(@Param('id') id: string) {
    return this.donationService.markAsExpired(id);
  }

  @Put(':id/reserve/:requestId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  reserveBloodUnit(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
  ) {
    return this.donationService.reserveForRequest(id, requestId);
  }

  // Blood Request Integration Endpoints

  @Get('suitable-units/:bloodType/:rhFactor/:unitsNeeded')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  findSuitableBloodUnits(
    @Param('bloodType') bloodType: string,
    @Param('rhFactor') rhFactor: string,
    @Param('unitsNeeded') unitsNeeded: string,
    @Query('bloodBankId') bloodBankId?: string,
  ) {
    const units = parseInt(unitsNeeded, 10);
    return this.donationService.findSuitableBloodUnitsForRequest(
      bloodType,
      rhFactor,
      units,
      bloodBankId,
    );
  }

  @Post('auto-fulfill-request/:requestId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  autoFulfillBloodRequest(
    @Param('requestId') requestId: string,
    @Body() autoFulfillDto: AutoFulfillBloodRequestDto,
  ) {
    const unitsNeeded = parseInt(autoFulfillDto.unitsNeeded, 10);
    return this.donationService.autoFulfillBloodRequest(
      requestId,
      autoFulfillDto.bloodType,
      autoFulfillDto.rhFactor,
      unitsNeeded,
      autoFulfillDto.bloodBankId,
    );
  }

  @Post('reserve-multiple-units/:requestId')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  reserveMultipleUnits(
    @Param('requestId') requestId: string,
    @Body() body: { donationIds: string[] },
  ) {
    return this.donationService.reserveBloodUnitsForRequest(
      body.donationIds,
      requestId,
    );
  }
}
