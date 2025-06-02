import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { CreateMedicalInstitutionDto } from './dto/create-medical-institution.dto';
import { UpdateMedicalInstitutionDto } from './dto/update-medical-institution.dto';
import {
  MedicalInstitution,
  MedicalInstitutionDocument,
} from './entities/medical-institution.entity';

@Injectable()
export class MedicalInstitutionService {
  constructor(
    @InjectModel(MedicalInstitution.name)
    private medicalInstitutionModel: Model<MedicalInstitutionDocument>,
  ) {}

  async create(
    dto: CreateMedicalInstitutionDto & { user?: string },
    options?: { session?: ClientSession },
  ) {
    const { coordinates, ...rest } = dto;

    const institution = new this.medicalInstitutionModel({
      ...rest,
      location: {
        type: 'Point',
        coordinates,
      },
    });

    return institution.save(options);
  }

  findAll() {
    return this.medicalInstitutionModel.find();
  }

  findOne(id: string) {
    return this.medicalInstitutionModel.findById(id);
  }

  update(id: string, dto: UpdateMedicalInstitutionDto) {
    const updateData: any = { ...dto };

    if (dto.coordinates) {
      updateData.location = {
        type: 'Point',
        coordinates: dto.coordinates,
      };
      delete updateData.coordinates;
    }

    return this.medicalInstitutionModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
  }

  remove(id: string) {
    return this.medicalInstitutionModel.findByIdAndDelete(id);
  }

  findByUser(userId: Types.ObjectId | string) {
    return this.medicalInstitutionModel.findOne({ user: userId });
  }

  findNearby(lng: number, lat: number, radius = 10) {
    return this.medicalInstitutionModel.find({
      location: {
        $geoWithin: {
          $centerSphere: [
            [lng, lat],
            radius / 6371, // Convert km to radians (Earth's radius is ~6371 km)
          ],
        },
      },
    });
  }

  findByRegistrationNumber(registrationNumber: string) {
    return this.medicalInstitutionModel.findOne({ registrationNumber });
  }
}
