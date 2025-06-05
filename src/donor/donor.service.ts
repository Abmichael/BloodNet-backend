// donor/donor.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDonorDto } from './dto/create-donor.dto';
import { UpdateDonorDto } from './dto/update-donor.dto';
import { Donor, DonorDocument } from './entities/donor.entity';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';
import { UsersService } from '../users/users.service';
import { ApiException } from '../common/filters/exception';

@Injectable()
export class DonorService {
  constructor(
    @InjectModel(Donor.name) private readonly donorModel: Model<DonorDocument>,
    private adminService: AdminService,
    private usersService: UsersService,
  ) {}

  async create(createDonorDto: CreateDonorDto) {
    const createdDonor = await this.donorModel.create(createDonorDto);

    // Set user association if user is provided
    if (createDonorDto.user) {
      try {
        await this.usersService.setDonorAssociation(
          createDonorDto.user.toString(),
          (createdDonor as any)._id.toString()
        );
      } catch (error) {
        console.error('Failed to set donor association in user record:', error);
      }
    }

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

    // Handle user association changes
    if (updatedDonor && existingDonor && updateDonorDto.user !== undefined) {
      const previousUserId = existingDonor.user?.toString();
      const newUserId = updateDonorDto.user;

      // If user association is being changed or removed
      if (previousUserId !== newUserId) {
        try {
          // Clear previous user's donor association if exists
          if (previousUserId) {
            await this.usersService.setDonorAssociation(previousUserId, null);
          }

          // Set new user's donor association if provided
          if (newUserId) {
            await this.usersService.setDonorAssociation(newUserId, id);
          }
        } catch (error) {
          console.error('Failed to update user association for donor:', error);
        }
      }
    }

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

  async remove(id: string): Promise<Donor> {
    // Validate ID format
    if (!id || typeof id !== 'string') {
      throw new ApiException([
        { field: 'id', message: 'Donor ID is required and must be a string' },
      ]);
    }

    // Find the donor first to get their data for logging and user association cleanup
    const existingDonor = await this.donorModel.findById(id).exec();
    if (!existingDonor) {
      throw new ApiException([
        { field: 'id', message: `Donor with ID ${id} not found` },
      ], 404);
    }

    // Clear user association if exists
    if (existingDonor.user) {
      try {
        await this.usersService.setDonorAssociation(existingDonor.user.toString(), null);
      } catch (error) {
        console.error('Failed to clear donor association from user record:', error);
        // Continue with deletion even if association cleanup fails
      }
    }

    // Delete the donor
    const deletedDonor = await this.donorModel.findByIdAndDelete(id).exec();
    if (!deletedDonor) {
      throw new ApiException([
        { field: 'id', message: `Failed to delete donor with ID ${id}` },
      ]);
    }

    // Log donor deletion activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED, // Using PROFILE_UPDATED as it's the closest available type
        title: 'Donor Profile Deleted',
        description: `Donor profile for ${deletedDonor.firstName} ${deletedDonor.lastName} was deleted from the system`,
        userId: deletedDonor.user?.toString(),
        metadata: {
          donorId: id,
          donorName: `${deletedDonor.firstName} ${deletedDonor.lastName}`,
          bloodType: deletedDonor.bloodType,
          rhFactor: deletedDonor.RhFactor,
          phoneNumber: deletedDonor.phoneNumber,
          email: deletedDonor.email,
          isEligible: deletedDonor.isEligible,
          totalDonations: deletedDonor.totalDonations,
          lastDonationDate: deletedDonor.lastDonationDate,
          userId: deletedDonor.user?.toString(),
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log donor deletion activity:', error);
    }

    return deletedDonor;
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
