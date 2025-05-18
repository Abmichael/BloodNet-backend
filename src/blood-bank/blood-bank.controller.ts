import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { BloodBankService } from './blood-bank.service';
import { CreateBloodBankDto } from './dto/create-blood-bank.dto';
import { UpdateBloodBankDto } from './dto/update-blood-bank.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { QueryFilter, ExtendedQueryString } from '../common/filters/query';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BloodBank, BloodBankDocument } from './entities/blood-bank.entity';

@Roles('admin')
@Controller('blood-bank')
export class BloodBankController {
  constructor(
    private readonly bloodBankService: BloodBankService,
    @InjectModel(BloodBank.name) private readonly bloodBankModel: Model<BloodBankDocument>
  ) {}

  @Post()
  create(@Body() dto: CreateBloodBankDto) {
    return this.bloodBankService.create(dto);
  }

  @Get()
  async findAll(@Query() query: ExtendedQueryString) {
    const baseQuery = this.bloodBankModel.find();
    
    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    
    return await filter.getResults();
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
