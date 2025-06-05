import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { CreateMedicalInstitutionDto } from './dto/create-medical-institution.dto';
import { UpdateMedicalInstitutionDto } from './dto/update-medical-institution.dto';
import {
  MedicalInstitution,
  MedicalInstitutionDocument,
} from './entities/medical-institution.entity';
import { AdminService } from '../admin/admin.service';
import { UsersService } from '../users/users.service';
import { ActivityType } from '../admin/entities/activity-log.entity';

@Injectable()
export class MedicalInstitutionService {
  constructor(
    @InjectModel(MedicalInstitution.name)
    private medicalInstitutionModel: Model<MedicalInstitutionDocument>,
    private adminService: AdminService,
    private usersService: UsersService,
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

    // Set institution association for user if provided
    if (dto.user) {
      try {
        await this.usersService.setInstitutionAssociation(
          dto.user,
          (savedInstitution as any)._id.toString(),
        );
      } catch (error) {
        console.error('Failed to set institution association for user:', error);
        // Don't throw error here as institution was created successfully
      }
    }

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
        console.error(
          'Failed to log medical institution registration activity:',
          error,
        );
      }
    }

    return savedInstitution;
  }

  findAll() {
    return this.medicalInstitutionModel
      .find()
      .populate({ path: 'user', select: 'name phoneNumber email createdAt' });
  }

  findOne(id: string) {
    return this.medicalInstitutionModel
      .findById(id)
      .populate({ path: 'user', select: 'name phoneNumber email createdAt' });
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

    const updatedInstitution =
      await this.medicalInstitutionModel.findByIdAndUpdate(id, updateData, {
        new: true,
      });

    // Handle user association changes
    if (updatedInstitution && existingInstitution && dto.user !== undefined) {
      const previousUserId = existingInstitution.user?.toString();
      const newUserId = dto.user;

      // If user association is being changed or removed
      if (previousUserId !== newUserId) {
        try {
          // Clear previous user's institution association if exists
          if (previousUserId) {
            await this.usersService.setInstitutionAssociation(
              previousUserId,
              null,
            );
          }

          // Set new user's institution association if provided
          if (newUserId) {
            await this.usersService.setInstitutionAssociation(newUserId, id);
          }
        } catch (error) {
          console.error(
            'Failed to update user association for medical institution:',
            error,
          );
        }
      }
    }

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
        console.error(
          'Failed to log medical institution profile update activity:',
          error,
        );
      }
    }

    return updatedInstitution;
  }

  async remove(id: string) {
    // Validate ID format
    if (!id || typeof id !== 'string') {
      throw new BadRequestException(
        'Medical institution ID is required and must be a string',
      );
    }

    // Find the medical institution first to get their data for logging and user association cleanup
    const existingInstitution = await this.medicalInstitutionModel
      .findById(id)
      .exec();
    if (!existingInstitution) {
      throw new NotFoundException(
        `Medical institution with ID ${id} not found`,
      );
    }

    // Clear user association if exists
    if (existingInstitution.user) {
      try {
        await this.usersService.setInstitutionAssociation(
          existingInstitution.user.toString(),
          null,
        );
      } catch (error) {
        console.error(
          'Failed to clear medical institution association from user record:',
          error,
        );
        // Continue with deletion even if association cleanup fails
      }
    }

    // Delete the medical institution
    const deletedInstitution = await this.medicalInstitutionModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedInstitution) {
      throw new NotFoundException(
        `Failed to delete medical institution with ID ${id}`,
      );
    }

    // Log medical institution deletion activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED, // Using PROFILE_UPDATED as it's the closest available type
        title: 'Medical Institution Profile Deleted',
        description: `Medical institution ${deletedInstitution.name} was deleted from the system`,
        userId: deletedInstitution.user?.toString(),
        metadata: {
          institutionId: id,
          institutionName: deletedInstitution.name,
          type: deletedInstitution.type,
          registrationNumber: deletedInstitution.registrationNumber,
          phoneNumber: deletedInstitution.phoneNumber,
          email: deletedInstitution.email,
          address: deletedInstitution.address,
          city: deletedInstitution.city,
          state: deletedInstitution.state,
          isActive: deletedInstitution.isActive,
          userId: deletedInstitution.user?.toString(),
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        'Failed to log medical institution deletion activity:',
        error,
      );
    }

    return deletedInstitution;
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
