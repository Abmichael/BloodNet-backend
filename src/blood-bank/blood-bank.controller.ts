import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BloodBankService } from './blood-bank.service';
import { CreateBloodBankDto } from './dto/create-blood-bank.dto';
import { UpdateBloodBankDto } from './dto/update-blood-bank.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Roles('admin')
@Controller('blood-bank')
export class BloodBankController {
  constructor(private readonly bloodBankService: BloodBankService) {}

  @Post()
  create(@Body() dto: CreateBloodBankDto) {
    return this.bloodBankService.create(dto);
  }

  @Get()
  findAll() {
    return this.bloodBankService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bloodBankService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBloodBankDto) {
    return this.bloodBankService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bloodBankService.remove(id);
  }
}
