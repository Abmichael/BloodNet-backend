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
import { QueryFilter, ExtendedQueryString } from '../common/filters/query';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/schemas/user.schema';
import { DonationService } from '../donation/donation.service';

@Roles(UserRole.ADMIN, UserRole.DONOR)
@Controller('donors')
export class DonorController {
  constructor(
    private readonly donorService: DonorService,
    private readonly donationService: DonationService,
  ) {}

  @Post()
  create(@Body() dto: CreateDonorDto, @Req() req: any) {
    return this.donorService.create({ ...dto, user: req.user._id });
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

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DONOR, UserRole.HOSPITAL)
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
  @Get('nearby')
  async findNearby(
    @Query('bloodType') bloodType: string,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius?: string,
    @Query() queryParams?: ExtendedQueryString,
  ) {
    const baseQuery = this.donorService.findNearby(
      bloodType,
      lng,
      lat,
      Number(radius),
    );

    const filter = new QueryFilter(baseQuery, queryParams || {})
      .sort()
      .limitFields()
      .paginate();
    return await filter.getResults();
  }

  @Get(':id/donations')
  @Roles(UserRole.ADMIN, UserRole.DONOR, UserRole.HOSPITAL)
  async getDonationHistory(@Param('id') id: string) {
    // Ensure the donor exists before fetching donations
    await this.donationService.assertDonorExists(id);
    return this.donationService.findAllByDonorQuery(id);
  }

  @Get(':id/donations/stats')
  @Roles(UserRole.ADMIN, UserRole.DONOR, UserRole.HOSPITAL)
  getDonationStats(@Param('id') id: string) {
    return this.donationService.getDonorStats(id);
  }
  @Get('by-phone/:phoneNumber')
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL)
  findByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.donorService.findByPhoneNumber(phoneNumber);
  }

  @Get('blood-type/:bloodType/:rhFactor')
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL)
  findByBloodType(
    @Param('bloodType') bloodType: string,
    @Param('rhFactor') rhFactor: string,
  ) {
    return this.donorService.findByBloodType(bloodType, rhFactor);
  }
}
