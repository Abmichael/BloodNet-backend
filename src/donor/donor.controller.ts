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
  ExtendedQueryString,
} from '../common/filters/query';

@Controller('donors')
export class DonorController {
  constructor(private readonly donorService: DonorService) {}

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
}
