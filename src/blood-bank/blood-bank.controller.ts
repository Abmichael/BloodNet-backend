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
  ParseFloatPipe,
  ParseArrayPipe,
} from '@nestjs/common';
import { BloodBankService } from './blood-bank.service';
import { CreateBloodBankDto } from './dto/create-blood-bank.dto';
import { UpdateBloodBankDto } from './dto/update-blood-bank.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { QueryFilter, ExtendedQueryString } from '../common/filters/query';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('blood-bank')
export class BloodBankController {
  constructor(private readonly bloodBankService: BloodBankService) {}
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBloodBankDto) {
    // Make sure location is properly formatted if not already
    if (
      dto.location &&
      Array.isArray(dto.location.coordinates) &&
      dto.location.coordinates.length === 2
    ) {
      // Ensure the type is 'Point'
      dto.location.type = 'Point';
    }
    return this.bloodBankService.create(dto);
  }

  @Get()
  @Public()
  async findAll(@Query() query: ExtendedQueryString) {
    const baseQuery = this.bloodBankService.findAll();

    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Get('search/name/:name')
  @Public()
  findByName(@Param('name') name: string) {
    return this.bloodBankService.findByName(name);
  }

  @Get('search/city/:city')
  @Public()
  findByCity(@Param('city') city: string) {
    return this.bloodBankService.findByCity(city);
  }
  @Get('search/coordinates')
  @Public()
  findByCoordinates(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('maxDistance', new ParseFloatPipe({ optional: true }))
    maxDistance?: number,
  ) {
    // MongoDB uses [longitude, latitude] order for coordinates
    return this.bloodBankService.findByCoordinates(
      latitude,
      longitude,
      maxDistance,
    );
  }

  @Get('search/nearby-blood-type')
  @Public()
  findNearbyWithBloodType(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('bloodType') bloodType: string,
    @Query('maxDistance', new ParseFloatPipe({ optional: true }))
    maxDistance?: number,
  ) {
    return this.bloodBankService.findNearbyWithBloodType(
      latitude,
      longitude,
      bloodType,
      maxDistance,
    );
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.bloodBankService.findOne(id);
  }
  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateBloodBankDto) {
    // Make sure location is properly formatted if included in update
    if (
      dto.location &&
      dto.location.coordinates &&
      Array.isArray(dto.location.coordinates) &&
      dto.location.coordinates.length === 2
    ) {
      // Ensure the type is 'Point'
      dto.location.type = 'Point';
    }
    return this.bloodBankService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.bloodBankService.remove(id);
  }

  @Patch(':id/toggle-status')
  @Roles('admin')
  toggleActiveStatus(@Param('id') id: string) {
    return this.bloodBankService.toggleActiveStatus(id);
  }

  @Patch(':id/blood-types')
  @Roles('admin')
  updateBloodTypes(
    @Param('id') id: string,
    @Body('bloodTypes', new ParseArrayPipe({ items: String }))
    bloodTypes: string[],
  ) {
    return this.bloodBankService.updateBloodTypesAvailable(id, bloodTypes);
  }
}
