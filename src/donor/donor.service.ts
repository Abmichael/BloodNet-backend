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
    let id = userId;
    if (typeof userId === 'string') {
      id = new Types.ObjectId(userId);
    }
    return this.donorModel
      .findOne({ user: id })
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

  async updateDonationInfo(
    id: string,
    data: {
      lastDonationDate?: Date;
      nextEligibleDate?: Date;
      totalDonations?: number;
    },
  ) {
    return this.donorModel.findByIdAndUpdate(id, data, { new: true });
  }

  async updateEligibility(
    id: string,
    isEligible: boolean,
    nextEligibleDate?: Date,
  ) {
    return this.donorModel.findByIdAndUpdate(
      id,
      { isEligible, nextEligibleDate },
      { new: true },
    );
  }
  async findByPhoneNumber(phoneNumber: string) {
    return this.donorModel.findOne({ phoneNumber });
  }

  async findByBloodType(bloodType: string, rhFactor: string) {
    return this.donorModel.find({
      bloodType,
      RhFactor: rhFactor,
      isEligible: true,
    });
  }

  findNearby(
    bloodType: string | undefined,
    lng: number,
    lat: number,
    radiusInKm = 10,
  ) {
    // Extract bloodType and RhFactor if present (e.g., 'O+' or 'A-')
    let typeOnly: string | undefined = undefined;
    let rhFactor: string | undefined = undefined;
    if (bloodType) {
      const match = bloodType.match(/^([ABOab]{1,2})([+-])$/i);
      if (match) {
        typeOnly = match[1].toUpperCase();
        rhFactor = match[2] === '+' ? '+' : '-';
      } else {
        typeOnly = bloodType;
      }
    }
    const geoNearStage: any = {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distance',
        maxDistance: radiusInKm * 1000, // meters
        spherical: true,
        query: { isEligible: true },
      },
    };
    if (typeOnly) {
      geoNearStage.$geoNear.query.bloodType = typeOnly;
    }
    if (rhFactor) {
      geoNearStage.$geoNear.query.RhFactor = rhFactor;
    }
    return [geoNearStage];
  }
}
