// donor/donor.controller.ts
import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import { DonorService } from './donor.service';
import { CreateDonorDto } from './dto/create-donor.dto';
import { UpdateDonorDto } from './dto/update-donor.dto';

@Controller('donors')
export class DonorController {
  constructor(private readonly donorService: DonorService) {}

  @Post()
  create(@Body() dto: CreateDonorDto) {
    return this.donorService.create(dto);
  }

  @Get()
  findAll() {
    return this.donorService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.donorService.findByUser(userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDonorDto) {
    return this.donorService.update(id, dto);
  }

  @Get('nearby')
  findNearby(
    @Query('bloodType') bloodType: string,
    @Query('lng') lng: number,
    @Query('lat') lat: number,
    @Query('radius') radius?: string,
  ) {
    return this.donorService.findNearby(bloodType, +lng, +lat, +(radius || 10));
  }
}
