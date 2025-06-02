import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { UpdateBloodRequestDto } from './dto/update-blood-request.dto';
import {
  BloodRequest,
  BloodRequestDocument,
  RequestStatus,
  RequestPriority,
} from './entities/blood-request.entity';
import { NotificationHelperService } from '../notifications/notification-helper.service';
import { DonorService } from '../donor/donor.service';
import { BloodBankService } from '../blood-bank/blood-bank.service';
import { BloodType } from '../donor/entities/donor.entity';

@Injectable()
export class BloodRequestService {
  constructor(
    @InjectModel(BloodRequest.name)
    private bloodRequestModel: Model<BloodRequestDocument>,
    private notificationHelper: NotificationHelperService,
    private donorService: DonorService,
    private bloodBankService: BloodBankService,
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

    const savedRequest = await request.save();

    // Automatically send notifications if enabled
    if (savedRequest.notifyNearbyDonors) {
      try {
        const requestId =
          savedRequest._id instanceof Types.ObjectId
            ? savedRequest._id.toString()
            : String(savedRequest._id);
        await this.sendBloodRequestNotifications(requestId);
      } catch (error) {
        console.error('Error sending blood request notifications:', error);
        // Don't fail the creation if notifications fail
      }
    }

    return savedRequest;
  }

  // Method to send notifications for a blood request with automatic donor/blood bank discovery
  async sendBloodRequestNotifications(bloodRequestId: string): Promise<void> {
    const bloodRequest = await this.bloodRequestModel
      .findById(bloodRequestId)
      .populate('institution', 'name')
      .exec();

    if (!bloodRequest) {
      throw new Error('Blood request not found');
    }

    // Find eligible donors
    const eligibleDonorIds = await this.findEligibleDonors(
      bloodRequest.bloodType,
      bloodRequest.RhFactor,
      bloodRequest.location.coordinates[0], // longitude
      bloodRequest.location.coordinates[1], // latitude
      bloodRequest.priority === 'critical' ? 20 : 50, // radius in km
    );

    // Find nearby blood banks
    const nearbyBloodBankIds = await this.findNearbyBloodBanks(
      bloodRequest.location.coordinates[0], // longitude
      bloodRequest.location.coordinates[1], // latitude
      100, // radius in km for blood banks
    ); // Get institution name for notifications
    const institutionName =
      (bloodRequest.institution as any)?.name || 'Medical Institution';

    // Send notifications
    if (eligibleDonorIds.length > 0 || nearbyBloodBankIds.length > 0) {
      await this.notificationHelper.notifyNewBloodRequest(
        bloodRequestId,
        bloodRequest.bloodType,
        institutionName,
        bloodRequest.priority,
        eligibleDonorIds,
        nearbyBloodBankIds,
      );
    }
  }

  // Helper method to find eligible donors
  private async findEligibleDonors(
    bloodType: string,
    rhFactor: string,
    lng: number,
    lat: number,
    radiusKm: number = 50,
  ): Promise<string[]> {
    try {
      // Use the donor service's findNearby method
      const nearbyDonorsQuery = this.donorService.findNearby(
        `${bloodType}${rhFactor}`,
        lng,
        lat,
        radiusKm,
      );

      // Execute the aggregation to get nearby eligible donors
      const donors = await this.donorService['donorModel'].aggregate([
        ...nearbyDonorsQuery,
        {
          $match: {
            isEligible: true,
            // Add additional filters if needed (e.g., last donation date)
          },
        },
        {
          $limit: 100, // Limit to prevent too many notifications
        },
      ]);

      return donors.map((donor) => donor._id.toString());
    } catch (error) {
      console.error('Error finding eligible donors:', error);
      return [];
    }
  }
  // Helper method to find nearby blood banks
  private async findNearbyBloodBanks(
    lng: number,
    lat: number,
    radiusKm: number = 100,
  ): Promise<string[]> {
    try {
      // Find nearby blood banks using geolocation
      const nearbyBloodBanks = await this.bloodBankService['bloodBankModel']
        .find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              $maxDistance: radiusKm * 1000, // Convert km to meters
            },
          },
          isActive: true, // Only active blood banks
        })
        .limit(20); // Limit results

      return nearbyBloodBanks.map((bloodBank) => {
        const id =
          bloodBank._id instanceof Types.ObjectId
            ? bloodBank._id.toString()
            : String(bloodBank._id);
        return id;
      });
    } catch (error) {
      console.error('Error finding nearby blood banks:', error);
      return [];
    }
  }
  // Updated method to notify about blood request (with automatic discovery if no IDs provided)
  async notifyBloodRequest(
    bloodRequestId: string,
    eligibleDonorIds: string[] = [],
    nearbyBloodBankIds: string[] = [],
  ) {
    // If no specific IDs provided, use automatic discovery
    if (eligibleDonorIds.length === 0 && nearbyBloodBankIds.length === 0) {
      await this.sendBloodRequestNotifications(bloodRequestId);
      return;
    }

    // Use provided IDs
    const bloodRequest = await this.bloodRequestModel
      .findById(bloodRequestId)
      .populate('institution', 'name')
      .exec();

    if (!bloodRequest) {
      throw new Error('Blood request not found');
    }

    const institutionName =
      (bloodRequest.institution as any)?.name || 'Medical Institution';

    if (eligibleDonorIds.length > 0 || nearbyBloodBankIds.length > 0) {
      await this.notificationHelper.notifyNewBloodRequest(
        bloodRequestId,
        bloodRequest.bloodType,
        institutionName,
        bloodRequest.priority,
        eligibleDonorIds,
        nearbyBloodBankIds,
      );
    }
  }

  findAll() {
    return this.bloodRequestModel.find();
  }

  // Public method to build filter criteria for donor (async)
  async buildDonorFilterCriteria(userId: string, includeLocation: boolean = false): Promise<any> {
    try {
      // First, get the donor profile for this user
      const donor = await this.donorService.findByUser(userId);
      
      if (!donor) {
        // If no donor profile exists, return filter that matches nothing
        return { _id: { $exists: false } };
      }

      // Build blood type compatibility filter
      const compatibleBloodTypes = this.getCompatibleBloodTypes(
        donor.bloodType,
        donor.RhFactor
      );

      if (compatibleBloodTypes.length === 0) {
        // If no compatible blood types, return filter that matches nothing
        return { _id: { $exists: false } };
      }

      // Base filter criteria
      const baseFilter: any = {
        status: RequestStatus.PENDING, // Only show pending requests
        $or: compatibleBloodTypes.map(({ bloodType, rhFactor }) => ({
          bloodType,
          RhFactor: rhFactor,
        })),
      };

      // Add location filter only if includeLocation is true and donor has location data
      if (
        includeLocation &&
        donor.location && 
        donor.location.coordinates && 
        donor.maxTravelDistance
      ) {
        // Use $geoWithin instead of $near to avoid conflicts with QueryFilter sorting
        baseFilter.location = {
          $geoWithin: {
            $centerSphere: [
              donor.location.coordinates,
              donor.maxTravelDistance / 6378.1 // Convert km to radians (Earth radius in km)
            ]
          }
        };
      }

      return baseFilter;
    } catch (error) {
      console.error('Error building donor filter criteria:', error);
      // Return filter that matches nothing on error
      return { _id: { $exists: false } };
    }
  }

  // Synchronous method that takes pre-built filter criteria
  findAllForDonor(filterCriteria: any) {
    return this.bloodRequestModel.find(filterCriteria);
  }

  // Helper method to determine compatible blood types for donation
  private getCompatibleBloodTypes(
    donorBloodType?: string,
    donorRhFactor?: string
  ): Array<{ bloodType: string; rhFactor: string }> {
    if (!donorBloodType || !donorRhFactor) {
      return []; // No compatibility if blood type unknown
    }

    const compatibleTypes: Array<{ bloodType: string; rhFactor: string }> = [];

    // Blood type compatibility rules for donation
    // (what blood types can this donor give to)
    switch (donorBloodType.toUpperCase()) {
      case 'O':
        // O donors can donate to everyone
        compatibleTypes.push(
          { bloodType: 'O', rhFactor: '+' },
          { bloodType: 'O', rhFactor: '-' },
          { bloodType: 'A', rhFactor: '+' },
          { bloodType: 'A', rhFactor: '-' },
          { bloodType: 'B', rhFactor: '+' },
          { bloodType: 'B', rhFactor: '-' },
          { bloodType: 'AB', rhFactor: '+' },
          { bloodType: 'AB', rhFactor: '-' }
        );
        break;
      case 'A':
        // A donors can donate to A and AB
        compatibleTypes.push(
          { bloodType: 'A', rhFactor: '+' },
          { bloodType: 'A', rhFactor: '-' },
          { bloodType: 'AB', rhFactor: '+' },
          { bloodType: 'AB', rhFactor: '-' }
        );
        break;
      case 'B':
        // B donors can donate to B and AB
        compatibleTypes.push(
          { bloodType: 'B', rhFactor: '+' },
          { bloodType: 'B', rhFactor: '-' },
          { bloodType: 'AB', rhFactor: '+' },
          { bloodType: 'AB', rhFactor: '-' }
        );
        break;
      case 'AB':
        // AB donors can only donate to AB
        compatibleTypes.push(
          { bloodType: 'AB', rhFactor: '+' },
          { bloodType: 'AB', rhFactor: '-' }
        );
        break;
    }

    // Apply Rh factor restrictions
    if (donorRhFactor === '-') {
      // Rh- donors can donate to both Rh+ and Rh-
      return compatibleTypes;
    } else {
      // Rh+ donors can only donate to Rh+
      return compatibleTypes.filter(type => type.rhFactor === '+');
    }
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

    return this.bloodRequestModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
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
      RhFactor: rhFactor,
    });
  }

  findNearby(
    bloodType: string,
    rhFactor: string,
    lng: number,
    lat: number,
    radius = 50,
  ) {
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

    return this.bloodRequestModel
      .find({
        status: RequestStatus.PENDING,
        $or: [
          { priority: 'critical' },
          { priority: 'high', requiredBy: { $lt: tomorrow } },
        ],
      })
      .sort({ priority: -1, requiredBy: 1 });
  }
  updateStatus(id: string, status: RequestStatus) {
    return this.bloodRequestModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
  }

  async fulfillBloodRequest(id: string, fulfilledByBloodBank: string) {
    const bloodRequest = await this.updateStatus(id, RequestStatus.FULFILLED);

    if (bloodRequest) {
      await this.notificationHelper.notifyBloodRequestFulfilled(
        bloodRequest.requestedBy.toString(),
        id,
        bloodRequest.bloodType,
        fulfilledByBloodBank,
      );
    }

    return bloodRequest;
  }
}
