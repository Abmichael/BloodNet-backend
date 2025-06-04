// donor/donor.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDonorDto } from './dto/create-donor.dto';
import { UpdateDonorDto } from './dto/update-donor.dto';
import { Donor, DonorDocument } from './entities/donor.entity';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';

@Injectable()
export class DonorService {
  constructor(
    @InjectModel(Donor.name) private readonly donorModel: Model<DonorDocument>,
    private adminService: AdminService,
  ) {}

  async create(createDonorDto: CreateDonorDto) {
    const createdDonor = await this.donorModel.create(createDonorDto);

    // Log donor registration activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.DONOR_REGISTERED,
        title: 'New Donor Registered',
        description: `Donor ${createDonorDto.firstName} ${createDonorDto.lastName} registered with blood type ${createDonorDto.bloodType}${createDonorDto.RhFactor}`,
        userId: createDonorDto.user?.toString(),
        metadata: {
          donorId: (createdDonor as any)._id.toString(),
          donorName: `${createDonorDto.firstName} ${createDonorDto.lastName}`,
          bloodType: createDonorDto.bloodType,
          rhFactor: createDonorDto.RhFactor,
          phoneNumber: createDonorDto.phoneNumber,
          email: createDonorDto.email,
          isEligible: createDonorDto.isEligible,
          registeredAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log donor registration activity:', error);
    }

    return createdDonor;
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
    const existingDonor = await this.donorModel.findById(id);
    const updatedDonor = await this.donorModel.findByIdAndUpdate(id, updateDonorDto, {
      new: true,
    });

    // Log profile update activity
    if (updatedDonor && existingDonor) {
      try {
        await this.adminService.logActivity({
          activityType: ActivityType.PROFILE_UPDATED,
          title: 'Donor Profile Updated',
          description: `Donor profile updated for ${updatedDonor.firstName} ${updatedDonor.lastName}`,
          userId: updatedDonor.user?.toString(),
          metadata: {
            donorId: id,
            donorName: `${updatedDonor.firstName} ${updatedDonor.lastName}`,
            previousData: {
              firstName: existingDonor.firstName,
              lastName: existingDonor.lastName,
              phoneNumber: existingDonor.phoneNumber,
              email: existingDonor.email,
              bloodType: existingDonor.bloodType,
              rhFactor: existingDonor.RhFactor,
              isEligible: existingDonor.isEligible,
            },
            newData: {
              firstName: updatedDonor.firstName,
              lastName: updatedDonor.lastName,
              phoneNumber: updatedDonor.phoneNumber,
              email: updatedDonor.email,
              bloodType: updatedDonor.bloodType,
              rhFactor: updatedDonor.RhFactor,
              isEligible: updatedDonor.isEligible,
            },
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to log donor profile update activity:', error);
      }
    }

    return updatedDonor;
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
