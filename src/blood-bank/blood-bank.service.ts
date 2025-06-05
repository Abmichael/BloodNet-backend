import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateBloodBankDto } from './dto/create-blood-bank.dto';
import { UpdateBloodBankDto } from './dto/update-blood-bank.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { BloodBank, BloodBankDocument } from './entities/blood-bank.entity';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class BloodBankService {
  constructor(
    @InjectModel(BloodBank.name)
    private readonly bloodBankModel: Model<BloodBankDocument>,
    private adminService: AdminService,
    private usersService: UsersService,
  ) {}

  async create(
    createDto: CreateBloodBankDto,
    options?: { session?: ClientSession },
  ) {
    const created = new this.bloodBankModel(createDto);
    const savedBloodBank = await created.save(options);

    // Set user association if user is provided
    if (createDto.user) {
      try {
        await this.usersService.setBloodBankAssociation(
          createDto.user.toString(),
          (savedBloodBank as any)._id.toString(),
        );
      } catch (error) {
        console.error(
          'Failed to set blood bank association in user record:',
          error,
        );
      }
    }

    // Log blood bank registration activity (only if not created via application process)
    if (!options?.session) {
      try {
        await this.adminService.logActivity({
          activityType: ActivityType.BLOOD_BANK_REGISTERED,
          title: 'Blood Bank Registered',
          description: `Blood bank ${createDto.name} registered directly in the system`,
          metadata: {
            bloodBankId: (savedBloodBank as any)._id.toString(),
            bloodBankName: createDto.name,
            city: createDto.city,
            state: createDto.state,
            contactNumber: createDto.contactNumber,
            email: createDto.email,
            bloodTypesAvailable: createDto.bloodTypesAvailable,
            registeredAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to log blood bank registration activity:', error);
      }
    }

    return savedBloodBank;
  }
  findAll() {
    return this.bloodBankModel
      .find()
      .populate({ path: 'user', select: 'name phoneNumber email createdAt' });
  }

  async findByUser(userId: Types.ObjectId | string) {
    return this.bloodBankModel.findOne({ user: userId }).exec();
  }

  async findOne(id: string) {
    const bloodBank = await this.bloodBankModel
      .findById(id)
      .populate({ path: 'user', select: 'name phoneNumber email createdAt' })
      .exec();
    if (!bloodBank) {
      throw new NotFoundException(`Blood bank with ID ${id} not found`);
    }
    return bloodBank;
  }

  async update(id: string, updateDto: UpdateBloodBankDto) {
    const existingBloodBank = await this.bloodBankModel.findById(id);
    if (!existingBloodBank) {
      throw new NotFoundException(`Blood bank with ID ${id} not found`);
    }

    const updated = await this.bloodBankModel.findByIdAndUpdate(id, updateDto, {
      new: true,
    });

    // Handle user association changes
    if (updated && existingBloodBank && updateDto.user !== undefined) {
      const previousUserId = existingBloodBank.user?.toString();
      const newUserId = updateDto.user;

      // If user association is being changed or removed
      if (previousUserId !== newUserId) {
        try {
          // Clear previous user's blood bank association if exists
          if (previousUserId) {
            await this.usersService.setBloodBankAssociation(
              previousUserId,
              null,
            );
          }

          // Set new user's blood bank association if provided
          if (newUserId) {
            await this.usersService.setBloodBankAssociation(newUserId, id);
          }
        } catch (error) {
          console.error(
            'Failed to update user association for blood bank:',
            error,
          );
        }
      }
    }

    // Log blood bank profile update activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED,
        title: 'Blood Bank Profile Updated',
        description: `Blood bank ${updated!.name} profile was updated`,
        metadata: {
          bloodBankId: id,
          bloodBankName: updated!.name,
          previousData: {
            name: existingBloodBank.name,
            contactNumber: existingBloodBank.contactNumber,
            email: existingBloodBank.email,
            bloodTypesAvailable: existingBloodBank.bloodTypesAvailable,
            isActive: existingBloodBank.isActive,
          },
          newData: {
            name: updated!.name,
            contactNumber: updated!.contactNumber,
            email: updated!.email,
            bloodTypesAvailable: updated!.bloodTypesAvailable,
            isActive: updated!.isActive,
          },
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log blood bank profile update activity:', error);
    }

    return updated;
  }

  async remove(id: string) {
    // Validate ID format
    if (!id || typeof id !== 'string') {
      throw new BadRequestException(
        'Blood bank ID is required and must be a string',
      );
    }

    // Find the blood bank first to get their data for logging and user association cleanup
    const existingBloodBank = await this.bloodBankModel.findById(id).exec();
    if (!existingBloodBank) {
      throw new NotFoundException(`Blood bank with ID ${id} not found`);
    }

    // Clear user association if exists
    if (existingBloodBank.user) {
      try {
        await this.usersService.setBloodBankAssociation(
          existingBloodBank.user.toString(),
          null,
        );
      } catch (error) {
        console.error(
          'Failed to clear blood bank association from user record:',
          error,
        );
        // Continue with deletion even if association cleanup fails
      }
    }

    // Delete the blood bank
    const deletedBloodBank = await this.bloodBankModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedBloodBank) {
      throw new NotFoundException(`Failed to delete blood bank with ID ${id}`);
    }

    // Log blood bank deletion activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED, // Using PROFILE_UPDATED as it's the closest available type
        title: 'Blood Bank Profile Deleted',
        description: `Blood bank ${deletedBloodBank.name} was deleted from the system`,
        userId: deletedBloodBank.user?.toString(),
        metadata: {
          bloodBankId: id,
          bloodBankName: deletedBloodBank.name,
          address: deletedBloodBank.address,
          contactNumber: deletedBloodBank.contactNumber,
          email: deletedBloodBank.email,
          isActive: deletedBloodBank.isActive,
          licenseNumber: deletedBloodBank.licenseNumber,
          userId: deletedBloodBank.user?.toString(),
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log blood bank deletion activity:', error);
    }

    return deletedBloodBank;
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
    const previousBloodTypes = bloodBank.bloodTypesAvailable;
    bloodBank.bloodTypesAvailable = bloodTypes;
    const savedBloodBank = await bloodBank.save();

    // Log inventory update activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.INVENTORY_UPDATE,
        title: 'Blood Types Availability Updated',
        description: `Blood types availability updated for ${bloodBank.name}`,
        metadata: {
          bloodBankId: id,
          bloodBankName: bloodBank.name,
          previousBloodTypes,
          newBloodTypes: bloodTypes,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log blood types update activity:', error);
    }

    return savedBloodBank;
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
