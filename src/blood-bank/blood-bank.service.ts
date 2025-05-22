import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  async create(createDto: CreateBloodBankDto) {
    try {
      const created = new this.bloodBankModel(createDto);
      return await created.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          'Blood bank with this name already exists',
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.bloodBankModel.find();
  }

  async findOne(id: string) {
    const bloodBank = await this.bloodBankModel.findById(id).exec();
    if (!bloodBank) {
      throw new NotFoundException(`Blood bank with ID ${id} not found`);
    }
    return bloodBank;
  }

  async update(id: string, updateDto: UpdateBloodBankDto) {
    const updated = await this.bloodBankModel.findByIdAndUpdate(id, updateDto, {
      new: true,
    });

    if (!updated) {
      throw new NotFoundException(`Blood bank with ID ${id} not found`);
    }

    return updated;
  }

  async remove(id: string) {
    const deleted = await this.bloodBankModel.findByIdAndDelete(id);

    if (!deleted) {
      throw new NotFoundException(`Blood bank with ID ${id} not found`);
    }

    return deleted;
  }
  async findByCoordinates(
    latitude: number,
    longitude: number,
    maxDistance: number = 10000,
  ) {
    // Find blood banks within a certain distance (in meters)
    return this.bloodBankModel
      .find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude], // MongoDB uses [longitude, latitude] order
            },
            $maxDistance: maxDistance,
          },
        },
      })
      .exec();
  }

  async findNearbyWithBloodType(
    latitude: number,
    longitude: number,
    bloodType: string,
    maxDistance: number = 10000,
  ) {
    // Find blood banks within a certain distance that have the specified blood type
    return this.bloodBankModel
      .find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: maxDistance,
          },
        },
        bloodTypesAvailable: bloodType,
        isActive: true,
      })
      .exec();
  }

  async findByName(name: string) {
    return this.bloodBankModel
      .findOne({
        name: { $regex: new RegExp(name, 'i') },
      })
      .exec();
  }

  async findByCity(city: string) {
    return this.bloodBankModel
      .find({
        city: { $regex: new RegExp(city, 'i') },
      })
      .exec();
  }

  async toggleActiveStatus(id: string) {
    const bloodBank = await this.findOne(id);
    bloodBank.isActive = !bloodBank.isActive;
    return bloodBank.save();
  }
  async updateBloodTypesAvailable(id: string, bloodTypes: string[]) {
    const bloodBank = await this.findOne(id);
    bloodBank.bloodTypesAvailable = bloodTypes;
    return bloodBank.save();
  }

  /**
   * Utility method to convert latitude and longitude to MongoDB GeoJSON Point format
   */
  convertToGeoPoint(
    latitude: number,
    longitude: number,
  ): { type: 'Point'; coordinates: [number, number] } {
    return {
      type: 'Point',
      coordinates: [longitude, latitude], // MongoDB uses [longitude, latitude] order
    };
  }
}
