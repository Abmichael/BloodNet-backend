import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { CreateMedicalInstitutionDto } from './dto/create-medical-institution.dto';
import { UpdateMedicalInstitutionDto } from './dto/update-medical-institution.dto';
import {
  MedicalInstitution,
  MedicalInstitutionDocument,
} from './entities/medical-institution.entity';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';

@Injectable()
export class MedicalInstitutionService {
  constructor(
    @InjectModel(MedicalInstitution.name)
    private medicalInstitutionModel: Model<MedicalInstitutionDocument>,
    private adminService: AdminService,
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

    const savedInstitution = await institution.save(options);

    // Log medical institution registration activity (only if not created via application process)
    if (!options?.session) {
      try {
        await this.adminService.logActivity({
          activityType: ActivityType.MEDICAL_INSTITUTION_REGISTERED,
          title: 'Medical Institution Registered',
          description: `Medical institution ${dto.name} registered directly in the system`,
          userId: dto.user?.toString(),
          metadata: {
            institutionId: (savedInstitution as any)._id.toString(),
            institutionName: dto.name,
            institutionType: dto.type,
            registrationNumber: dto.registrationNumber,
            phoneNumber: dto.phoneNumber,
            email: dto.email,
            city: dto.city,
            state: dto.state,
            registeredAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to log medical institution registration activity:', error);
      }
    }

    return savedInstitution;
  }

  findAll() {
    return this.medicalInstitutionModel.find();
  }

  findOne(id: string) {
    return this.medicalInstitutionModel.findById(id);
  }

  async update(id: string, dto: UpdateMedicalInstitutionDto) {
    const existingInstitution = await this.medicalInstitutionModel.findById(id);
    const updateData: any = { ...dto };

    if (dto.coordinates) {
      updateData.location = {
        type: 'Point',
        coordinates: dto.coordinates,
      };
      delete updateData.coordinates;
    }

    const updatedInstitution = await this.medicalInstitutionModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    // Log medical institution profile update activity
    if (updatedInstitution && existingInstitution) {
      try {
        await this.adminService.logActivity({
          activityType: ActivityType.PROFILE_UPDATED,
          title: 'Medical Institution Profile Updated',
          description: `Medical institution ${updatedInstitution.name} profile was updated`,
          userId: (updatedInstitution as any).user?.toString(),
          metadata: {
            institutionId: id,
            institutionName: updatedInstitution.name,
            previousData: {
              name: existingInstitution.name,
              type: existingInstitution.type,
              phoneNumber: existingInstitution.phoneNumber,
              email: existingInstitution.email,
              isActive: existingInstitution.isActive,
            },
            newData: {
              name: updatedInstitution.name,
              type: updatedInstitution.type,
              phoneNumber: updatedInstitution.phoneNumber,
              email: updatedInstitution.email,
              isActive: updatedInstitution.isActive,
            },
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to log medical institution profile update activity:', error);
      }
    }

    return updatedInstitution;
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
