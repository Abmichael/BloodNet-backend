import { Injectable } from '@nestjs/common';
import { CreateBloodBankDto } from './dto/create-blood-bank.dto';
import { UpdateBloodBankDto } from './dto/update-blood-bank.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BloodBank, BloodBankDocument } from './entities/blood-bank.entity';

@Injectable()
export class BloodBankService {
  constructor(
    @InjectModel(BloodBank.name)
    private readonly bloodBankModel: Model<BloodBankDocument>,
  ) {}

  create(createDto: CreateBloodBankDto) {
    const created = new this.bloodBankModel(createDto);
    return created.save();
  }

  findAll() {
    return this.bloodBankModel.find().exec();
  }

  findOne(id: string) {
    return this.bloodBankModel.findById(id).exec();
  }

  update(id: string, updateDto: UpdateBloodBankDto) {
    return this.bloodBankModel.findByIdAndUpdate(id, updateDto, { new: true });
  }

  remove(id: string) {
    return this.bloodBankModel.findByIdAndDelete(id);
  }
}
