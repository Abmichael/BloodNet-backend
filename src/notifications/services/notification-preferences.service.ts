import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NotificationPreferences,
  NotificationPreferencesDocument,
} from '../entities/notification-preferences.entity';

/**
 * Interface for notification settings update
 */
export interface UpdateNotificationPreferencesDto {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  preferredEmail?: string;
  preferredPhone?: string;
  deviceToken?: string;
  types?: {
    bloodRequest?: boolean;
    donationResults?: boolean;
    appointmentReminders?: boolean;
    general?: boolean;
  };
}

/**
 * Service to manage notification preferences for users
 */
@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(
    @InjectModel(NotificationPreferences.name)
    private notificationPreferencesModel: Model<NotificationPreferencesDocument>,
  ) {}

  /**
   * Get notification preferences for a user
   * @param userId The user ID
   * @param userType The user type (donor, blood bank, medical institution)
   */
  async getPreferences(
    userId: string,
    userType: string,
  ): Promise<NotificationPreferences> {
    try {
      // Try to find existing preferences
      const preferences = await this.notificationPreferencesModel
        .findOne({
          userId: new Types.ObjectId(userId),
          userType: userType,
        })
        .exec();

      // Return preferences if found
      if (preferences) {
        return preferences;
      }

      // Create default preferences if none exists
      const defaultPreferences = this.getDefaultPreferences(userId, userType);
      const newPreferences = new this.notificationPreferencesModel(
        defaultPreferences,
      );
      await newPreferences.save();

      return newPreferences;
    } catch (error) {
      this.logger.error(
        `Error getting preferences for ${userType} ${userId}: ${error.message}`,
      );
      // Return default preferences if error occurs
      return this.getDefaultPreferences(
        userId,
        userType,
      ) as NotificationPreferences;
    }
  }

  /**
   * Update notification preferences for a user
   * @param userId The user ID
   * @param userType The user type (donor, blood bank, medical institution)
   * @param preferences The updated preferences
   */
  async updatePreferences(
    userId: string,
    userType: string,
    preferences: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    try {
      // Determine which model to use based on userType
      let userModel = '';
      switch (userType) {
        case 'donor':
          userModel = 'Donor';
          break;
        case 'blood_bank':
          userModel = 'BloodBank';
          break;
        case 'medical_institution':
          userModel = 'MedicalInstitution';
          break;
        case 'admin':
          userModel = 'User';
          break;
        default:
          userModel = 'User';
      }

      // Update or create if not exists
      const result = await this.notificationPreferencesModel
        .findOneAndUpdate(
          {
            userId: new Types.ObjectId(userId),
            userType: userType,
          },
          {
            $set: {
              ...preferences,
              userModel,
              lastUpdated: new Date(),
            },
          },
          {
            new: true, // Return updated document
            upsert: true, // Create if not exists
          },
        )
        .exec();

      this.logger.log(`Updated preferences for ${userType} ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error updating preferences for ${userType} ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(
    userId: string,
    userType: string,
  ): Partial<NotificationPreferences> {
    // Determine which model to use based on userType
    let userModel = '';
    switch (userType) {
      case 'donor':
        userModel = 'Donor';
        break;
      case 'blood_bank':
        userModel = 'BloodBank';
        break;
      case 'medical_institution':
        userModel = 'MedicalInstitution';
        break;
      case 'admin':
        userModel = 'User';
        break;
      default:
        userModel = 'User';
    }

    return {
      userId: new Types.ObjectId(userId),
      userType,
      userModel,
      inAppEnabled: true,
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: false,
      types: {
        bloodRequest: true,
        donationResults: true,
        appointmentReminders: true,
        general: true,
      },
      lastUpdated: new Date(),
    };
  }
}
