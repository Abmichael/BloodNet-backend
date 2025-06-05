// donor/donor.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  Req,
  Patch,
} from '@nestjs/common';
import { DonorService } from './donor.service';
import { CreateDonorDto } from './dto/create-donor.dto';
import { UpdateDonorDto } from './dto/update-donor.dto';
import {
  QueryFilter,
  AggregationFilter,
  ExtendedQueryString,
} from '../common/filters/query';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/schemas/user.schema';
import { DonationService } from '../donation/donation.service';

@Roles(UserRole.ADMIN, UserRole.DONOR, UserRole.BLOOD_BANK)
@Controller('donors')
export class DonorController {
  constructor(
    private readonly donorService: DonorService,
    private readonly donationService: DonationService,
  ) {}

  @Post()
  create(@Body() dto: CreateDonorDto, @Req() req: any) {
    let user;

    if (req.user && req.user.role) {
      user = req.user._id;
    }
    return this.donorService.create({ ...dto, user });
  }

  @Get()
  async findAll(@Query() query: ExtendedQueryString) {
    const baseQuery = this.donorService.findAll();

    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('nearby')
  async findNearby(
    @Query('lng') lng?: number,
    @Query('lat') lat?: number,
    @Query('radius') radius?: string,
    @Query('bloodType') bloodType?: string,
    @Query() queryParams?: ExtendedQueryString,
  ) {
    if (lng === undefined || lat === undefined) {
      return {
        statusCode: 400,
        message: 'lng and lat query parameters are required',
      };
    }
    // Build the aggregation pipeline using the donorService
    const pipeline = this.donorService.findNearby(
      bloodType,
      lng,
      lat,
      Number(radius),
    );
    // Use AggregationFilter for aggregation pipelines
    const aggregation = new AggregationFilter(
      this.donorService['donorModel'],
      pipeline,
      queryParams || {},
    )
      .sort()
      .limitFields()
      .paginate();
    return await aggregation.execute();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DONOR, UserRole.MEDICAL_INSTITUTION)
  findOne(@Param('id') id: string) {
    return this.donorService.findOne(id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.donorService.findByUser(userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDonorDto) {
    return this.donorService.update(id, dto);
  }

  @Get(':id/donations')
  @Roles(UserRole.ADMIN, UserRole.DONOR, UserRole.MEDICAL_INSTITUTION)
  async getDonationHistory(@Param('id') id: string) {
    // Ensure the donor exists before fetching donations
    await this.donationService.assertDonorExists(id);
    return this.donationService.findAllByDonorQuery(id);
  }

  @Get(':id/donations/stats')
  @Roles(UserRole.ADMIN, UserRole.DONOR, UserRole.MEDICAL_INSTITUTION)
  getDonationStats(@Param('id') id: string) {
    return this.donationService.getDonorStats(id);
  }
  @Get('by-phone/:phoneNumber')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  findByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.donorService.findByPhoneNumber(phoneNumber);
  }

  @Get('blood-type/:bloodType/:rhFactor')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  findByBloodType(
    @Param('bloodType') bloodType: string,
    @Param('rhFactor') rhFactor: string,
  ) {
    return this.donorService.findByBloodType(bloodType, rhFactor);
  }
}
