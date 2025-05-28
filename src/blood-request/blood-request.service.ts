import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { UpdateBloodRequestDto } from './dto/update-blood-request.dto';
import { BloodRequest, BloodRequestDocument, RequestStatus } from './entities/blood-request.entity';

@Injectable()
export class BloodRequestService {
  constructor(
    @InjectModel(BloodRequest.name)
    private bloodRequestModel: Model<BloodRequestDocument>,
  ) {}

  async create(dto: CreateBloodRequestDto & { requestedBy: string }) {
    const { coordinates, ...rest } = dto;
    
    const request = new this.bloodRequestModel({
      ...rest,
      location: {
        type: 'Point',
        coordinates,
      },
    });
    
    return request.save();
  }

  findAll() {
    return this.bloodRequestModel.find();
  }

  findOne(id: string) {
    return this.bloodRequestModel.findById(id);
  }

  update(id: string, dto: UpdateBloodRequestDto) {
    const updateData: any = { ...dto };
    
    if (dto.coordinates) {
      updateData.location = {
        type: 'Point',
        coordinates: dto.coordinates,
      };
      delete updateData.coordinates;
    }
    
    return this.bloodRequestModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );
  }

  remove(id: string) {
    return this.bloodRequestModel.findByIdAndDelete(id);
  }

  findByInstitution(institutionId: string) {
    return this.bloodRequestModel.find({ institution: institutionId });
  }

  findByStatus(status: RequestStatus) {
    return this.bloodRequestModel.find({ status });
  }

  findByBloodType(bloodType: string, rhFactor: string) {
    return this.bloodRequestModel.find({ 
      bloodType, 
      RhFactor: rhFactor 
    });
  }

  findNearby(bloodType: string, rhFactor: string, lng: number, lat: number, radius = 50) {
    return this.bloodRequestModel.find({
      bloodType,
      RhFactor: rhFactor,
      status: RequestStatus.PENDING,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radius * 1000, // Convert km to meters
        },
      },
    });
  }

  findUrgent() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.bloodRequestModel.find({
      status: RequestStatus.PENDING,
      $or: [
        { priority: 'critical' },
        { priority: 'high', requiredBy: { $lt: tomorrow } }
      ]
    }).sort({ priority: -1, requiredBy: 1 });
  }

  updateStatus(id: string, status: RequestStatus) {
    return this.bloodRequestModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
  }
}
