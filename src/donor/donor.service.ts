// donor/donor.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDonorDto } from './dto/create-donor.dto';
import { UpdateDonorDto } from './dto/update-donor.dto';
import { Donor, DonorDocument } from './entities/donor.entity';

@Injectable()
export class DonorService {
  constructor(
    @InjectModel(Donor.name) private readonly donorModel: Model<DonorDocument>,
  ) {}

  async create(createDonorDto: CreateDonorDto) {
    return this.donorModel.create(createDonorDto);
  }

  async findAll() {
    return this.donorModel.find().populate('user');
  }

  async findByUser(userId: Types.ObjectId | string) {
    return this.donorModel.findOne({ user: userId }).populate('user');
  }

  async update(id: string, updateDonorDto: UpdateDonorDto) {
    return this.donorModel.findByIdAndUpdate(id, updateDonorDto, {
      new: true,
    });
  }

  async findNearby(
    bloodType: string,
    lng: number,
    lat: number,
    radiusInKm = 10,
  ) {
    return this.donorModel.find({
      bloodType,
      isEligible: true,
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radiusInKm * 1000, // meters
        },
      },
    });
  }
}
