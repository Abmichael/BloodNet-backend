import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BloodBagService } from './blood-bag.service';
import { CreateBloodBagDto } from './dto/create-blood-bag.dto';
import { UpdateBloodBagDto } from './dto/update-blood-bag.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Roles('admin')
@Controller('blood-bag')
export class BloodBagController {
  constructor(private readonly bloodBagService: BloodBagService) {}

  @Post()
  create(@Body() dto: CreateBloodBagDto) {
    return this.bloodBagService.create(dto);
  }

  @Get()
  findAll() {
    return this.bloodBagService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bloodBagService.findOne(id);
  }
}
