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
import { MedicalInstitutionService } from './medical-institution.service';
import { CreateMedicalInstitutionDto } from './dto/create-medical-institution.dto';
import { UpdateMedicalInstitutionDto } from './dto/update-medical-institution.dto';
import { QueryFilter, ExtendedQueryString } from '../common/filters/query';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/schemas/user.schema';

@Roles(UserRole.ADMIN, UserRole.HOSPITAL)
@Controller('medical-institutions')
export class MedicalInstitutionController {
  constructor(
    private readonly medicalInstitutionService: MedicalInstitutionService,
  ) {}

  @Post()
  create(@Body() dto: CreateMedicalInstitutionDto, @Req() req: any) {
    return this.medicalInstitutionService.create({
      ...dto,
      user: req.user._id,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL, UserRole.DONOR)
  async findAll(@Query() query: ExtendedQueryString) {
    const baseQuery = this.medicalInstitutionService.findAll();

    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.medicalInstitutionService.findByUser(userId);
  }

  @Get('nearby')
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL, UserRole.DONOR)
  async findNearby(
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius?: string,
    @Query() queryParams?: ExtendedQueryString,
  ) {
    const baseQuery = this.medicalInstitutionService.findNearby(
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

  @Get('registration/:registrationNumber')
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL)
  findByRegistrationNumber(
    @Param('registrationNumber') registrationNumber: string,
  ) {
    return this.medicalInstitutionService.findByRegistrationNumber(
      registrationNumber,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.HOSPITAL, UserRole.DONOR)
  findOne(@Param('id') id: string) {
    return this.medicalInstitutionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMedicalInstitutionDto) {
    return this.medicalInstitutionService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.medicalInstitutionService.remove(id);
  }
}