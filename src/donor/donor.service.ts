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

  findAll() {
    return this.donorModel
      .find()
      .populate({ path: 'user', select: '-password' });
  }
  async findByUser(userId: Types.ObjectId | string) {
    return this.donorModel
      .findOne({ user: userId })
      .populate({ path: 'user', select: '-password' });
  }

  async findOne(id: string) {
    return this.donorModel.findById(id);
  }
  
  async update(id: string, updateDonorDto: UpdateDonorDto) {
    return this.donorModel.findByIdAndUpdate(id, updateDonorDto, {
      new: true,
    });
  }

  async updateDonationInfo(id: string, data: {
    lastDonationDate?: Date;
    nextEligibleDate?: Date;
    totalDonations?: number;
  }) {
    return this.donorModel.findByIdAndUpdate(id, data, { new: true });
  }

  async updateEligibility(id: string, isEligible: boolean, nextEligibleDate?: Date) {
    return this.donorModel.findByIdAndUpdate(
      id,
      { isEligible, nextEligibleDate },
      { new: true }
    );
  }
  async findByPhoneNumber(phoneNumber: string) {
    return this.donorModel.findOne({ phoneNumber });
  }

  async findByBloodType(bloodType: string, rhFactor: string) {
    return this.donorModel.find({ 
      bloodType, 
      RhFactor: rhFactor,
      isEligible: true 
    });
  }

  findNearby(
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
