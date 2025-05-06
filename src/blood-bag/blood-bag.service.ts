import { Injectable } from '@nestjs/common';
import { CreateBloodBagDto } from './dto/create-blood-bag.dto';
import { UpdateBloodBagDto } from './dto/update-blood-bag.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BloodBag, BloodBagDocument } from './entities/blood-bag.entity';

@Injectable()
export class BloodBagService {
  constructor(
    @InjectModel(BloodBag.name)
    private readonly bloodBagModel: Model<BloodBagDocument>,
  ) {}

  async create(createBloodBagDto: CreateBloodBagDto): Promise<BloodBag> {
    const created = new this.bloodBagModel(createBloodBagDto);
    return created.save();
  }

  async findAll(): Promise<BloodBag[]> {
    return this.bloodBagModel.find().populate(['donor', 'bloodBank']);
  }

  async findOne(id: string): Promise<BloodBag | null> {
    return this.bloodBagModel.findById(id).populate(['donor', 'bloodBank']);
  }
}
