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
} from '@nestjs/common';
import { DonationService } from './donation.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { QueryFilter } from '../common/filters/query/query-filter';
import { ExtendedQueryString } from '../common/filters/query/filter.types';

@Controller('donations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL)
  create(@Body() createDonationDto: CreateDonationDto) {
    return this.donationService.create(createDonationDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL)
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
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL, UserRole.DONOR)
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
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL, UserRole.DONOR)
  getDonorStats(@Param('donorId') donorId: string) {
    return this.donationService.getDonorStats(donorId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL, UserRole.DONOR)
  findOne(@Param('id') id: string) {
    return this.donationService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL)
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
}
