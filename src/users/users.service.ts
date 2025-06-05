import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import * as mongoose from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { ApiException } from 'src/common/filters/exception';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';

export interface UserSearchOptions {
  limit: number;
  page: number;
}

export interface UserSearchResult {
  users: UserDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private adminService: AdminService,
  ) {}

  /**
   * Search users by email query with pagination
   * @param query - Email search query
   * @param options - Pagination options
   * @returns Promise<UserSearchResult>
   */
  async searchUsers(
    query: string,
    options: UserSearchOptions,
  ): Promise<UserSearchResult> {
    try {
      const { limit, page } = options;
      const skip = (page - 1) * limit;

      // Build search criteria
      const searchCriteria = {
        email: {
          $regex: query.trim(),
          $options: 'i', // Case-insensitive search
        },
        // Optionally exclude certain roles or include only specific roles
        // role: { $in: [UserRole.DONOR, UserRole.BLOOD_BANK, UserRole.HOSPITAL] },
      };

      // Execute search with pagination
      const [users, total] = await Promise.all([
        this.userModel
          .find(searchCriteria)
          .select('_id email role createdAt updatedAt') // Only return necessary fields
          .sort({ email: 1 }) // Sort alphabetically by email
          .skip(skip)
          .limit(limit)
          .lean() // Use lean for better performance
          .exec(),
        this.userModel.countDocuments(searchCriteria).exec(),
      ]);

      const totalPages = Math.ceil(total / limit);

      console.debug(
        `User search completed: query="${query}", found=${users.length}/${total} users`,
      );

      return {
        users,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error(`Error searching users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search users by email query (simplified version without pagination)
   * @param query - Email search query
   * @param maxResults - Maximum number of results (default: 20)
   * @returns Promise<UserDocument[]>
   */
  async searchUsersByEmail(
    query: string,
    maxResults: number = 20,
  ): Promise<UserDocument[]> {
    try {
      const searchCriteria = {
        email: {
          $regex: query.trim(),
          $options: 'i',
        },
        isActive: { $ne: false },
      };

      const users = await this.userModel
        .find(searchCriteria)
        .select('_id email role createdAt')
        .sort({ email: 1 })
        .limit(Math.min(maxResults, 50))
        .lean()
        .exec();

      return users;
    } catch (error) {
      console.error(
        `Error searching users by email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }
  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(new mongoose.Types.ObjectId(id));
    if (!user) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: id,
          },
        ],
        404,
      ); // Status code 404 (Not Found)
    }
    return user;
  }
  async create(
    userData: Partial<User>,
    options?: { session?: ClientSession },
  ): Promise<UserDocument> {
    const createdUser = new this.userModel(userData);
    return createdUser.save(options);
  }

  async updateProfileStatus(
    userId: string,
    profileComplete: boolean,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      { profileComplete },
      { new: true },
    );
    if (!updatedUser) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: userId,
          },
        ],
        404,
      );
    }

    // Log profile completion status update
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED,
        title: profileComplete ? 'Profile Completed' : 'Profile Status Updated',
        description: `User profile completion status changed to ${profileComplete ? 'complete' : 'incomplete'}`,
        userId: userId,
        metadata: {
          userId: userId,
          email: updatedUser.email,
          role: updatedUser.role,
          profileComplete,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log profile status update activity:', error);
    }

    return updatedUser;
  }

  async setDonorAssociation(
    userId: string,
    donorId: string | null,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      { donorId: donorId ? new mongoose.Types.ObjectId(donorId) : null },
      { new: true },
    );
    if (!updatedUser) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: userId,
          },
        ],
        404,
      );
    }

    // Log donor association
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED,
        title: donorId ? 'Donor Association Set' : 'Donor Association Cleared',
        description: donorId
          ? `User associated with donor profile`
          : `User donor association cleared`,
        userId: userId,
        metadata: {
          userId: userId,
          donorId: donorId,
          email: updatedUser.email,
          role: updatedUser.role,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log donor association activity:', error);
    }

    return updatedUser;
  }

  async setBloodBankAssociation(
    userId: string,
    bloodBankId: string | null,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      { bloodBankId: bloodBankId ? new mongoose.Types.ObjectId(bloodBankId) : null },
      { new: true },
    );
    if (!updatedUser) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: userId,
          },
        ],
        404,
      );
    }

    // Log blood bank association
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED,
        title: bloodBankId
          ? 'Blood Bank Association Set'
          : 'Blood Bank Association Cleared',
        description: bloodBankId
          ? `User associated with blood bank profile`
          : `User blood bank association cleared`,
        userId: userId,
        metadata: {
          userId: userId,
          bloodBankId: bloodBankId,
          email: updatedUser.email,
          role: updatedUser.role,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log blood bank association activity:', error);
    }

    return updatedUser;
  }

  async setInstitutionAssociation(
    userId: string,
    institutionId: string | null,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      { institutionId: institutionId ? new mongoose.Types.ObjectId(institutionId) : null },
      { new: true },
    );
    if (!updatedUser) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: userId,
          },
        ],
        404,
      );
    }

    // Log institution association
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED,
        title: institutionId
          ? 'Institution Association Set'
          : 'Institution Association Cleared',
        description: institutionId
          ? `User associated with medical institution profile`
          : `User medical institution association cleared`,
        userId: userId,
        metadata: {
          userId: userId,
          institutionId: institutionId,
          email: updatedUser.email,
          role: updatedUser.role,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log institution association activity:', error);
    }

    return updatedUser;
  }

  async updateResourceAssociations(
    userId: string,
    associations: {
      donorId?: string | null;
      bloodBankId?: string | null;
      institutionId?: string | null;
    },
  ): Promise<UserDocument> {
    const updateData: any = {};

    if (associations.donorId !== undefined) {
      updateData.donorId = associations.donorId ? new mongoose.Types.ObjectId(associations.donorId) : null;
    }
    if (associations.bloodBankId !== undefined) {
      updateData.bloodBankId = associations.bloodBankId ? new mongoose.Types.ObjectId(associations.bloodBankId) : null;
    }
    if (associations.institutionId !== undefined) {
      updateData.institutionId = associations.institutionId ? new mongoose.Types.ObjectId(associations.institutionId) : null;
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      updateData,
      { new: true },
    );

    if (!updatedUser) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: userId,
          },
        ],
        404,
      );
    }

    // Log resource associations update
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.PROFILE_UPDATED,
        title: 'Resource Associations Updated',
        description: `User resource associations updated`,
        userId: userId,
        metadata: {
          userId: userId,
          associations,
          email: updatedUser.email,
          role: updatedUser.role,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        'Failed to log resource associations update activity:',
        error,
      );
    }

    return updatedUser;
  }

  /**
   * Handle association changes ensuring proper bidirectional sync
   * This method safely removes old associations and sets new ones
   */
  async changeUserAssociation(
    userId: string,
    newAssociation: {
      type: 'donor' | 'bloodBank' | 'institution';
      resourceId: string | null;
    },
  ): Promise<UserDocument> {
    const existingUser = await this.userModel.findById(new mongoose.Types.ObjectId(userId));
    if (!existingUser) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: userId,
          },
        ],
        404,
      );
    }

    // Clear existing associations for this user
    await this.clearUserAssociations(userId, newAssociation.type);

    // Set new association if provided
    if (newAssociation.resourceId) {
      switch (newAssociation.type) {
        case 'donor':
          return this.setDonorAssociation(userId, newAssociation.resourceId);
        case 'bloodBank':
          return this.setBloodBankAssociation(
            userId,
            newAssociation.resourceId,
          );
        case 'institution':
          return this.setInstitutionAssociation(
            userId,
            newAssociation.resourceId,
          );
        default:
          throw new Error(`Unknown association type: ${newAssociation.type}`);
      }
    }

    return existingUser;
  }

  /**
   * Clear specific association type for a user
   */
  private async clearUserAssociations(
    userId: string,
    keepType?: 'donor' | 'bloodBank' | 'institution',
  ): Promise<void> {
    const updates: any = {};

    // Clear all associations except the one we want to keep
    if (keepType !== 'donor') updates.donorId = null;
    if (keepType !== 'bloodBank') updates.bloodBankId = null;
    if (keepType !== 'institution') updates.institutionId = null;

    if (Object.keys(updates).length > 0) {
      await this.userModel.findByIdAndUpdate(new mongoose.Types.ObjectId(userId), updates);
    }
  }

  /**
   * Find users by their resource associations
   */
  async findUserByDonorId(donorId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ donorId: new mongoose.Types.ObjectId(donorId) }).exec();
  }

  async findUserByBloodBankId(
    bloodBankId: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ bloodBankId: new mongoose.Types.ObjectId(bloodBankId) }).exec();
  }

  async findUserByInstitutionId(
    institutionId: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ institutionId: new mongoose.Types.ObjectId(institutionId) }).exec();
  }

  /**
   * Synchronize user associations when resources are updated externally
   * This ensures consistency when resource entities change their user associations
   */
  async syncResourceAssociation(
    resourceType: 'donor' | 'bloodBank' | 'institution',
    resourceId: string,
    newUserId: string | null,
    oldUserId?: string,
  ): Promise<void> {
    try {
      // Clear old user association if provided
      if (oldUserId) {
        switch (resourceType) {
          case 'donor':
            await this.setDonorAssociation(oldUserId, null);
            break;
          case 'bloodBank':
            await this.setBloodBankAssociation(oldUserId, null);
            break;
          case 'institution':
            await this.setInstitutionAssociation(oldUserId, null);
            break;
          default:
            console.error(`Unknown resource type for sync: ${resourceType}`);
        }
      }

      // Set new user association if provided
      if (newUserId) {
        switch (resourceType) {
          case 'donor':
            await this.setDonorAssociation(newUserId, resourceId);
            break;
          case 'bloodBank':
            await this.setBloodBankAssociation(newUserId, resourceId);
            break;
          case 'institution':
            await this.setInstitutionAssociation(newUserId, resourceId);
            break;
          default:
            console.error(`Unknown resource type for sync: ${resourceType}`);
        }
      }
    } catch (error) {
      console.error(`Failed to sync ${resourceType} association:`, error);
    }
  }
}
