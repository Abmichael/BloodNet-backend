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
  Delete,
} from '@nestjs/common';
import { BloodRequestService } from './blood-request.service';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { UpdateBloodRequestDto } from './dto/update-blood-request.dto';
import { QueryFilter, ExtendedQueryString } from '../common/filters/query';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/schemas/user.schema';
import { RequestStatus } from './entities/blood-request.entity';

@Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR, UserRole.BLOOD_BANK)
@Controller('blood-requests')
export class BloodRequestController {
  constructor(private readonly bloodRequestService: BloodRequestService) {}

  @Post()
  create(@Body() dto: CreateBloodRequestDto, @Req() req: any) {
    return this.bloodRequestService.create({
      ...dto,
      requestedBy: req.user._id,
    });
  }

  @Get()
  async findAll(@Query() query: ExtendedQueryString, @Req() req: any) {
    let baseQuery;

    // If the user is a DONOR, filter requests to only show relevant ones
    if (req.user.role === UserRole.DONOR) {
      // Check if location filtering should be included (defaults to true)
      const includeLocation = Object.hasOwn(query, 'includeLocation');

      // Get the filter criteria first (async)
      const donorFilterCriteria =
        await this.bloodRequestService.buildDonorFilterCriteria(
          req.user._id,
          includeLocation,
        );
      console.log('donorFilterCriteria:', donorFilterCriteria);
      baseQuery = this.bloodRequestService.findAllForDonor(donorFilterCriteria);
    } else {
      // For admins and medical institutions, use the standard approach
      baseQuery = this.bloodRequestService.findAll();
    }

    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bloodRequestService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBloodRequestDto) {
    return this.bloodRequestService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.bloodRequestService.remove(id);
  }

  @Get('institution/:institutionId')
  findByInstitution(@Param('institutionId') institutionId: string) {
    return this.bloodRequestService.findByInstitution(institutionId);
  }

  @Get('status/:status')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  findByStatus(@Param('status') status: RequestStatus) {
    return this.bloodRequestService.findByStatus(status);
  }

  @Get('blood-type/:bloodType/:rhFactor')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  findByBloodType(
    @Param('bloodType') bloodType: string,
    @Param('rhFactor') rhFactor: string,
  ) {
    return this.bloodRequestService.findByBloodType(bloodType, rhFactor);
  }

  @Get('nearby')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  async findNearby(
    @Query('bloodType') bloodType: string,
    @Query('rhFactor') rhFactor: string,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius?: string,
    @Query() queryParams?: ExtendedQueryString,
  ) {
    const baseQuery = this.bloodRequestService.findNearby(
      bloodType,
      rhFactor,
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

  @Get('urgent')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION, UserRole.DONOR)
  findUrgent() {
    return this.bloodRequestService.findUrgent();
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION)
  updateStatus(@Param('id') id: string, @Body('status') status: RequestStatus) {
    return this.bloodRequestService.updateStatus(id, status);
  }
}
