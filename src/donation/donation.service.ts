import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import {
  UpdateBloodUnitStatusDto,
  DispatchBloodUnitDto,
  UseBloodUnitDto,
  DiscardBloodUnitDto,
} from './dto/update-blood-unit-status.dto';
import { Donation, DonationDocument } from './entities/donation.entity';
import { DonorService } from '../donor/donor.service';
import { BloodBankService } from '../blood-bank/blood-bank.service';
import { ApiException, MongooseException } from '../common/filters/exception';
import { DonationStatus, BloodUnitStatus } from './donation.constants';
import { NotificationHelperService } from '../notifications/notification-helper.service';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';
import { DonorDocument } from 'src/donor/entities/donor.entity';
import { ResourceProtectionService } from '../common/guards/resource-protection.service';
import { UserDocument, UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';

// Interface representing the authenticated user context
interface UserContext {
  userId: string;
  userRole: UserRole;
}

@Injectable()
export class DonationService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
    @Inject(forwardRef(() => DonorService)) private donorService: DonorService,
    private notificationHelper: NotificationHelperService,
    private bloodBankService: BloodBankService,
    @Inject(forwardRef(() => AdminService)) private adminService: AdminService,
    private resourceProtection: ResourceProtectionService,
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
  ) {}
  async create(
    createDonationDto: CreateDonationDto,
    user?: Partial<UserDocument>,
  ): Promise<Donation> {
    // Check if donor exists
    let donorExists: DonorDocument | null = null;
    if (createDonationDto.donor) {
      donorExists = await this.donorService.findOne(createDonationDto.donor);
      if (!donorExists) {
        throw new ApiException([
          {
            field: 'donor',
            message: `Donor with ID ${createDonationDto.donor} not found`,
          },
        ]);
      }

      // Check if the user has permission to create donation for this donor
      if (user && user.role === UserRole.DONOR) {
        // Donors can only create donations for themselves
        this.resourceProtection.verifyAccess(
          user._id as string,
          user.role,
          createDonationDto.donor,
          'donation',
          [UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION],
        );
      }
    }

    const createdDonation = new this.donationModel({
      ...createDonationDto,
      bloodType: donorExists
        ? (donorExists.bloodType ?? '') + (donorExists.RhFactor ?? '')
        : undefined,
    });
    const savedDonation = await createdDonation.save();

    // Log the donation creation activity
    await this.adminService.logActivity({
      activityType: ActivityType.DONATION,
      title: 'New Donation Created',
      description: `Donation of ${savedDonation.volumeCollected || 'unknown'}ml ${savedDonation.donationType || 'blood'} scheduled`,
      userId: createDonationDto.donor,
      metadata: {
        donationId: savedDonation._id as string,
        bloodType: savedDonation.bloodType,
        volumeCollected: savedDonation.volumeCollected,
        donationType: savedDonation.donationType,
        status: savedDonation.status,
        bloodBankId: savedDonation.bloodBank,
      },
    });

    // Update donor's last donation date if the donation is completed
    if (createDonationDto.status === DonationStatus.COMPLETED) {
      // Set initial blood unit status and calculate expiry date
      savedDonation.unitStatus = BloodUnitStatus.IN_INVENTORY;
      savedDonation.expiryDate = this.calculateExpiryDate(
        savedDonation.donationDate,
        savedDonation.donationType,
      );
      await savedDonation.save();

      await this.updateDonorOnDonation(savedDonation);

      // Log completion activity
      await this.adminService.logActivity({
        activityType: ActivityType.DONATION_COMPLETED,
        title: 'Donation Completed',
        description: `Blood donation successfully completed by donor`,
        userId: createDonationDto.donor,
        metadata: {
          donationId: savedDonation._id as string,
          bloodType: savedDonation.bloodType,
          volumeCollected: savedDonation.volumeCollected,
        },
      });
    }

    return savedDonation;
    // Note: MongooseErrorInterceptor will automatically catch and process any Mongoose errors
  }
  findAll(user?: Partial<UserDocument>) {
    // Apply resource protection filters if user context is provided
    const query = user
      ? this.donationModel.find(this.resourceProtection.buildAccessFilter(user))
      : this.donationModel.find();

    return query
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber');
  }

  async assertDonorExists(
    donorId: string,
    user?: Partial<UserDocument>,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(donorId)) {
      throw new ApiException([
        { field: 'donorId', message: `Invalid donor ID format: ${donorId}` },
      ]);
    }
    const donorExists = await this.donorService.findOne(donorId);
    if (!donorExists) {
      throw new ApiException([
        { field: 'donorId', message: `Donor with ID ${donorId} not found` },
      ]);
    }

    // Verify user has access to this donor's data
    if (user && user.role === UserRole.DONOR && user._id !== donorId) {
      throw new ApiException([
        {
          field: 'donorId',
          message: `You do not have permission to access this donor's data`,
        },
      ]);
    }
  }

  findAllByDonorQuery(donorId: string, user?: Partial<UserDocument>) {
    // If user is a donor, verify they can only access their own records
    if (user && user.role === UserRole.DONOR && user._id !== donorId) {
      // Return empty query that will match nothing
      return this.donationModel.find({ _id: { $exists: false } });
    }

    return this.donationModel
      .find({ donor: new Types.ObjectId(donorId) })
      .sort({ donationDate: -1 })
      .populate('bloodBank', 'name location');
  }

  async findOne(id: string, user?: Partial<UserDocument>): Promise<Donation> {
    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiException([
        { field: 'id', message: `Invalid donation ID format: ${id}` },
      ]);
    }

    let queryConditions: any = { _id: new Types.ObjectId(id) };

    if (user && user._id && user.role) {
      const accessFilter = this.resourceProtection.buildAccessFilter(
        user,
        'donation',
      );
      queryConditions = { ...queryConditions, ...accessFilter };
    }

    const donation = await this.donationModel
      .findOne(queryConditions)
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber')
      .exec();

    if (!donation) {
      throw new ApiException([
        {
          field: 'id',
          message: `Donation with ID ${id} not found or access denied.`,
        },
      ]);
    }

    return donation;
    // Note: MongooseErrorInterceptor will automatically catch and process any Mongoose errors
  }
  async update(
    id: string,
    updateDonationDto: UpdateDonationDto,
    user?: Partial<UserDocument>,
  ): Promise<Donation> {
    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiException([
        { field: 'id', message: `Invalid donation ID format: ${id}` },
      ]);
    }

    // First check if the donation exists
    const previousDonation = await this.donationModel.findById(id).exec();
    if (!previousDonation) {
      throw new ApiException([
        { field: 'id', message: `Donation with ID ${id} not found` },
      ]);
    }

    // Verify user has permission to update this donation
    if (user) {
      // For donors, only allow updates to their own records and with limited fields
      if (user.role === UserRole.DONOR) {
        // Verify ownership
        this.resourceProtection.verifyAccess(
          user._id as string,
          user.role,
          previousDonation.donor.toString(),
          'donation',
          [UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION],
        );

        // Donors should have limited update capabilities
        // Define permitted fields that a donor can update
        const donorPermittedFields = ['notes', 'emergencyContact'];

        // Filter out non-permitted fields
        const filteredUpdateDto: UpdateDonationDto = {};
        Object.keys(updateDonationDto).forEach((key) => {
          if (donorPermittedFields.includes(key)) {
            filteredUpdateDto[key] = updateDonationDto[key];
          }
        });

        // Replace with filtered DTO
        updateDonationDto = filteredUpdateDto;
      } else if (
        user.role === UserRole.MEDICAL_INSTITUTION ||
        user.role === UserRole.BLOOD_BANK
      ) {
        // Medical institutions and blood banks should be able to update donations
        // related to them
        const allowedRoles = [UserRole.ADMIN, UserRole.MEDICAL_INSTITUTION];

        let hasAccess = this.resourceProtection.canAccess(
          user._id as string,
          user.role,
          previousDonation.donor.toString(),
          allowedRoles,
        );

        // Also check if this blood bank owns the donation
        if (
          !hasAccess &&
          user.role === UserRole.BLOOD_BANK &&
          previousDonation.bloodBank
        ) {
          hasAccess =
            previousDonation.bloodBank.toString() === (user._id as string);
        }

        if (!hasAccess) {
          throw new ApiException([
            {
              field: 'id',
              message: `You do not have permission to update this donation`,
            },
          ]);
        }
      }
    }

    // Update the donation
    const updatedDonation = await this.donationModel
      .findByIdAndUpdate(id, updateDonationDto, { new: true })
      .exec();

    if (!updatedDonation) {
      throw new ApiException([
        {
          field: 'id',
          message: `Donation with ID ${id} not found after update`,
        },
      ]);
    }

    // Log the update activity
    await this.adminService.logActivity({
      activityType: ActivityType.DONATION,
      title: 'Donation Updated',
      description: `Donation status changed from ${previousDonation.status} to ${updatedDonation.status}`,
      userId: updatedDonation.donor.toString(),
      metadata: {
        donationId: updatedDonation._id as string,
        previousStatus: previousDonation.status,
        newStatus: updatedDonation.status,
        volumeCollected: updatedDonation.volumeCollected,
      },
    });

    // If donation status changed to COMPLETED, update donor
    if (
      previousDonation.status !== DonationStatus.COMPLETED &&
      updateDonationDto.status === DonationStatus.COMPLETED
    ) {
      // Set initial blood unit status and calculate expiry date for newly completed donations
      const completionUpdate: any = {
        unitStatus: BloodUnitStatus.IN_INVENTORY,
        expiryDate: this.calculateExpiryDate(
          updatedDonation.donationDate,
          updatedDonation.donationType,
        ),
      };

      await this.donationModel.findByIdAndUpdate(
        updatedDonation._id,
        completionUpdate,
      );

      await this.updateDonorOnDonation(updatedDonation);
    }

    if (!updatedDonation) {
      throw new ApiException([
        {
          field: 'id',
          message: `Donation with ID ${id} not found after update`,
        },
      ]);
    }

    return updatedDonation;
    // Note: MongooseErrorInterceptor will automatically catch and process any Mongoose errors
  }

  async remove(id: string, user?: Partial<UserDocument>): Promise<Donation> {
    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiException([
        { field: 'id', message: `Invalid donation ID format: ${id}` },
      ]);
    }

    // Find donation first to check ownership
    const donation = await this.donationModel.findById(id).exec();
    if (!donation) {
      throw new ApiException([
        { field: 'id', message: `Donation with ID ${id} not found` },
      ]);
    }

    // Verify user has permission to delete
    if (user) {
      // Only admins can delete donations
      if (user.role !== UserRole.ADMIN) {
        throw new ApiException([
          { field: 'id', message: `Only administrators can delete donations` },
        ]);
      }
    }

    const deletedDonation = await this.donationModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedDonation) {
      throw new ApiException([
        { field: 'id', message: `Donation with ID ${id} not found` },
      ]);
    }

    // Log the deletion activity
    await this.adminService.logActivity({
      activityType: ActivityType.DONATION,
      title: 'Donation Deleted',
      description: `Donation record deleted`,
      userId: deletedDonation.donor.toString(),
      metadata: {
        donationId: deletedDonation._id as string,
        bloodType: deletedDonation.bloodType,
        volumeCollected: deletedDonation.volumeCollected,
        donationType: deletedDonation.donationType,
        deletedAt: new Date(),
      },
    });

    return deletedDonation as Donation;
  } // Helper methods
  private async updateDonorOnDonation(
    donation: Donation | null,
  ): Promise<void> {
    if (!donation || !donation.donor) {
      console.error('Cannot update donor: donation or donation.donor is null');
      return;
    }

    try {
      const donorId = donation.donor.toString();

      // Get all completed donations for this donor
      const completedDonations = await this.donationModel
        .find({
          donor: donation.donor,
          status: DonationStatus.COMPLETED,
        })
        .exec();

      // Create update object with only fields that have values
      const updateData: any = {
        totalDonations: completedDonations.length,
      };

      // Only include fields if they exist in the donation
      if (donation.donationDate) {
        updateData.lastDonationDate = donation.donationDate;
      }

      if (donation.nextEligibleDonationDate) {
        updateData.nextEligibleDate = donation.nextEligibleDonationDate;
      }

      // Update donor's information
      await this.donorService.update(donorId, updateData);
    } catch (error) {
      console.error('Error updating donor after donation:', error);
      // We don't throw here to prevent donation creation/update from failing
      // The donation record is more important than updating the donor summary
    }
  }
  async getDonorStats(
    donorId: string,
    user?: Partial<UserDocument>,
  ): Promise<any> {
    // Validate ID format
    if (!Types.ObjectId.isValid(donorId)) {
      throw new ApiException([
        { field: 'donorId', message: `Invalid donor ID format: ${donorId}` },
      ]);
    }

    // Validate that the donor exists
    const donorExists = await this.donorService.findOne(donorId);
    if (!donorExists) {
      throw new ApiException([
        { field: 'donorId', message: `Donor with ID ${donorId} not found` },
      ]);
    }

    // Verify user has access to this donor's data
    if (user) {
      const isPrivilegedRole =
        user.role === UserRole.ADMIN ||
        user.role === UserRole.MEDICAL_INSTITUTION;

      let canAccess = isPrivilegedRole;

      if (!canAccess && user.role === UserRole.DONOR) {
        // Check if donor is accessing their own stats
        if (user._id && user._id.toString() === donorId) {
          canAccess = true;
        }
      }

      if (!canAccess) {
        throw new ApiException([
          {
            field: 'donorId',
            message: `User does not have permission to access stats for donor ${donorId}.`,
          },
        ]);
      }
    }

    const donations = await this.donationModel
      .find({
        donor: new Types.ObjectId(donorId),
        status: DonationStatus.COMPLETED,
      })
      .sort({ donationDate: 1 })
      .populate('bloodBank', 'name location') // Populate blood bank information
      .exec();

    return {
      totalDonations: donations.length,
      volumeDonated: donations.reduce(
        (sum, donation) => sum + (donation.volumeCollected || 0),
        0,
      ),
      firstDonation: donations.length > 0 ? donations[0].donationDate : null,
      lastDonation:
        donations.length > 0
          ? donations[donations.length - 1].donationDate
          : null,
      donationHistory: donations.map((d) => ({
        id: d._id,
        date: d.donationDate,
        volume: d.volumeCollected,
        type: d.donationType,
        location: d.bloodBank,
        status: d.status,
      })),
    };
    // Note: MongooseErrorInterceptor will automatically catch and process any Mongoose errors
  }
  // Enhanced method to notify when donation results are ready
  async notifyDonationResultsReady(donationId: string, bloodBankName?: string) {
    const donation = await this.donationModel
      .findById(donationId)
      .populate('bloodBank', 'name location contactNumber')
      .exec();

    if (!donation) {
      throw new ApiException([
        {
          field: 'donationId',
          message: `Donation with ID ${donationId} not found`,
        },
      ]);
    }

    // Determine the blood bank name
    let resolvedBloodBankName = bloodBankName;

    // Use the populated blood bank name if available and no specific name was provided
    if (!resolvedBloodBankName && donation.bloodBank) {
      if (
        typeof donation.bloodBank === 'object' &&
        (donation.bloodBank as any).name
      ) {
        resolvedBloodBankName = (donation.bloodBank as any).name;
      } else {
        // Try to fetch from blood bank service
        try {
          const bloodBank = await this.bloodBankService.findOne(
            donation.bloodBank.toString(),
          );
          resolvedBloodBankName = bloodBank.name;
        } catch (err) {
          console.error('Error fetching blood bank details:', err);
          resolvedBloodBankName = 'Blood Bank'; // Fallback name
        }
      }
    }

    // Use generic name as last resort
    if (!resolvedBloodBankName) {
      resolvedBloodBankName = 'Blood Bank';
    }

    await this.notificationHelper.notifyDonationCompleted(
      donation.donor.toString(),
      donationId,
      donation.donationDate,
      resolvedBloodBankName,
    );

    return {
      success: true,
      message: `Donation result notification sent to donor. Results ready at ${resolvedBloodBankName}.`,
    };
  }

  // Blood Unit Status Management Methods

  /**
   * Update blood unit status with comprehensive tracking
   */
  async updateBloodUnitStatus(
    donationId: string,
    updateDto: UpdateBloodUnitStatusDto,
    user?: Partial<UserDocument>,
  ): Promise<Donation> {
    // Validate donation ID
    if (!Types.ObjectId.isValid(donationId)) {
      throw new ApiException([
        {
          field: 'donationId',
          message: `Invalid donation ID format: ${donationId}`,
        },
      ]);
    }

    // Find the donation
    const donation = await this.donationModel.findById(donationId).exec();
    if (!donation) {
      throw new ApiException([
        {
          field: 'donationId',
          message: `Donation with ID ${donationId} not found`,
        },
      ]);
    }

    // Verify user has permission to update blood unit status
    if (user) {
      // Blood unit status can only be updated by admins, medical institutions, or associated blood banks
      if (user.role === UserRole.DONOR) {
        throw new ApiException([
          {
            field: 'donationId',
            message: 'Donors are not permitted to update blood unit status',
          },
        ]);
      }

      // Check if user is blood bank and donation belongs to them
      if (user.role === UserRole.BLOOD_BANK) {
        if (
          !donation.bloodBank ||
          donation.bloodBank.toString() !== (user._id as string)
        ) {
          throw new ApiException([
            {
              field: 'donationId',
              message:
                'You do not have permission to update the status of this blood unit',
            },
          ]);
        }
      }

      // Medical institutions can only update if they have a relationship with this donation
      if (user.role === UserRole.MEDICAL_INSTITUTION) {
        // Check if this institution is associated with this donation
        // This would typically be through dispatchedTo
        const isMedicalInstitutionAllowed =
          donation.dispatchedTo === (user._id as string);

        if (!isMedicalInstitutionAllowed) {
          throw new ApiException([
            {
              field: 'donationId',
              message:
                'This medical institution does not have permission to update this blood unit unless it was dispatched to them.',
            },
          ]);
        }
      }
    }

    // Only allow status updates for completed donations
    if (donation.status !== DonationStatus.COMPLETED) {
      throw new ApiException([
        {
          field: 'donationId',
          message: `Cannot update blood unit status for donation with status: ${donation.status}. Only completed donations can have their blood unit status updated.`,
        },
      ]);
    }

    // Validate status transitions
    await this.validateStatusTransition(
      donation.unitStatus,
      updateDto.unitStatus,
    );

    // Calculate expiry date if not set and status is being set to IN_INVENTORY
    let expiryDate = donation.expiryDate;
    if (!expiryDate && updateDto.unitStatus === BloodUnitStatus.IN_INVENTORY) {
      expiryDate = this.calculateExpiryDate(
        donation.donationDate,
        donation.donationType,
      );
    }

    // Prepare update data
    const updateData: any = {
      unitStatus: updateDto.unitStatus,
      expiryDate,
    };

    // Add status-specific fields
    if (updateDto.dispatchedTo)
      updateData.dispatchedTo = updateDto.dispatchedTo;
    if (updateDto.dispatchedAt)
      updateData.dispatchedAt = new Date(updateDto.dispatchedAt);
    if (updateDto.usedFor) updateData.usedFor = updateDto.usedFor;
    if (updateDto.usedAt) updateData.usedAt = new Date(updateDto.usedAt);
    if (updateDto.discardReason)
      updateData.discardReason = updateDto.discardReason;
    if (updateDto.discardedAt)
      updateData.discardedAt = new Date(updateDto.discardedAt);
    if (updateDto.reservedForRequest)
      updateData.reservedForRequest = new Types.ObjectId(
        updateDto.reservedForRequest,
      );

    // Update the donation
    const updatedDonation = await this.donationModel
      .findByIdAndUpdate(donationId, updateData, { new: true })
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber')
      .exec();

    if (!updatedDonation) {
      throw new ApiException([
        {
          field: 'donationId',
          message: `Failed to update donation with ID ${donationId}`,
        },
      ]);
    }

    // Log the status change activity
    await this.adminService.logActivity({
      activityType: ActivityType.DONATION,
      title: 'Blood Unit Status Updated',
      description: `Blood unit status changed from ${donation.unitStatus || 'unknown'} to ${updateDto.unitStatus}`,
      userId: updatedDonation.donor.toString(),
      metadata: {
        donationId: updatedDonation._id as string,
        previousStatus: donation.unitStatus,
        newStatus: updateDto.unitStatus,
        bloodType: updatedDonation.bloodType,
        volumeCollected: updatedDonation.volumeCollected,
        dispatchedTo: updateDto.dispatchedTo,
        usedFor: updateDto.usedFor,
        discardReason: updateDto.discardReason,
      },
    });

    return updatedDonation;
  }

  /**
   * Mark blood unit as dispatched to a hospital/institution
   */
  async markAsDispatched(
    donationId: string,
    dispatchDto: DispatchBloodUnitDto,
    user?: Partial<UserDocument>,
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.DISPATCHED,
      dispatchedTo: dispatchDto.dispatchedTo,
      dispatchedAt: dispatchDto.dispatchedAt || new Date().toISOString(),
    };

    if (dispatchDto.forRequest) {
      updateDto.reservedForRequest = dispatchDto.forRequest;
    }

    return this.updateBloodUnitStatus(donationId, updateDto, user);
  }

  /**
   * Mark blood unit as used for a patient
   */
  async markAsUsed(
    donationId: string,
    useDto: UseBloodUnitDto,
    user?: Partial<UserDocument>,
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.USED,
      usedFor: useDto.usedFor,
      usedAt: useDto.usedAt || new Date().toISOString(),
    };

    return this.updateBloodUnitStatus(donationId, updateDto, user);
  }

  /**
   * Mark blood unit as discarded
   */
  async markAsDiscarded(
    donationId: string,
    discardDto: DiscardBloodUnitDto,
    user?: Partial<UserDocument>,
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.DISCARDED,
      discardReason: discardDto.discardReason,
      discardedAt: discardDto.discardedAt || new Date().toISOString(),
    };

    return this.updateBloodUnitStatus(donationId, updateDto, user);
  }

  /**
   * Mark blood unit as expired
   */
  async markAsExpired(
    donationId: string,
    user?: Partial<UserDocument>,
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.EXPIRED,
    };

    return this.updateBloodUnitStatus(donationId, updateDto, user);
  }

  /**
   * Reserve blood unit for a specific blood request
   */
  async reserveForRequest(
    donationId: string,
    requestId: string,
    user?: Partial<UserDocument>,
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.RESERVED,
      reservedForRequest: requestId,
    };

    return this.updateBloodUnitStatus(donationId, updateDto, user);
  }

  /**
   * Get all blood units with a specific status
   */
  getBloodUnitsByStatus(status: BloodUnitStatus, user?: Partial<UserDocument>) {
    // Build base query
    const baseQuery = {
      status: DonationStatus.COMPLETED,
      unitStatus: status,
    };

    // Apply access control filter if user context is provided
    const query = user
      ? {
          ...baseQuery,
          ...this.resourceProtection.buildAccessFilter(user, 'donation'),
        }
      : baseQuery;

    return this.donationModel
      .find(query)
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber');
  }

  /**
   * Get expired blood units
   */
  getExpiredBloodUnits(user?: Partial<UserDocument>) {
    const now = new Date();

    // Build base query
    const baseQuery: any = {
      status: DonationStatus.COMPLETED,
      unitStatus: {
        $in: [BloodUnitStatus.IN_INVENTORY, BloodUnitStatus.RESERVED],
      },
      expiryDate: { $lt: now },
    };

    let query = baseQuery;

    // Apply access control filter if user context is provided
    if (user && user._id && user.role) {
      const accessFilter = this.resourceProtection.buildAccessFilter(
        user,
        'bloodBank', // Assuming 'bloodBank' is the correct resource type here based on original logic
      );
      query = {
        ...baseQuery,
        ...accessFilter,
      };
    }

    return this.donationModel
      .find(query)
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber')
      .sort({ expiryDate: 1 });
  }

  /**
   * Get blood units expiring within a specified number of days
   */
  getBloodUnitsExpiringSoon(days: number = 3, user?: Partial<UserDocument>) {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + days);

    // Build base query
    const baseQuery: any = {
      status: DonationStatus.COMPLETED,
      unitStatus: {
        $in: [BloodUnitStatus.IN_INVENTORY, BloodUnitStatus.RESERVED],
      },
      expiryDate: { $lte: expiryThreshold, $gte: new Date() },
    };

    let query = baseQuery;

    // Apply access control filter if user context is provided
    if (user && user._id && user.role) {
      const accessFilter = this.resourceProtection.buildAccessFilter(
        user,
        'bloodBank', // Assuming 'bloodBank' is the correct resource type here
      );
      query = {
        ...baseQuery,
        ...accessFilter,
      };
    }

    return this.donationModel
      .find(query)
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber')
      .sort({ expiryDate: 1 });
  }

  /**
   * Process expired blood units (mark as expired)
   */
  async processExpiredBloodUnits(user?: Partial<UserDocument>): Promise<{
    processed: number;
    units: Donation[];
  }> {
    const expiredUnits = await this.getExpiredBloodUnits(user);

    const processedUnits: Donation[] = [];
    for (const unit of expiredUnits) {
      try {
        const unitDoc = unit as DonationDocument;
        const updatedUnit = await this.markAsExpired(
          (unitDoc._id as Types.ObjectId).toString(),
        );
        processedUnits.push(updatedUnit);
      } catch (error) {
        console.error(
          `Failed to mark unit ${(unit as DonationDocument)._id} as expired:`,
          error,
        );
      }
    }

    return {
      processed: processedUnits.length,
      units: processedUnits,
    };
  }

  /**
   * Get blood unit status tracking information
   */
  async getBloodUnitTrackingInfo(
    donationId: string,
    user?: Partial<UserDocument>,
  ): Promise<any> {
    if (!Types.ObjectId.isValid(donationId)) {
      throw new ApiException([
        {
          field: 'donationId',
          message: `Invalid donation ID format: ${donationId}`,
        },
      ]);
    }

    const donation = await this.donationModel
      .findById(donationId)
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber')
      .populate('reservedForRequest', 'requestId urgencyLevel')
      .exec();

    if (!donation) {
      throw new ApiException([
        {
          field: 'donationId',
          message: `Donation with ID ${donationId} not found`,
        },
      ]);
    }

    // Verify user has access to this blood unit tracking info
    if (user) {
      // For donors, only allow access to their own donations
      if (user.role === UserRole.DONOR) {
        if (!user._id || user._id.toString() !== donation.donor.toString()) {
          throw new ApiException([
            {
              field: 'donationId',
              message:
                'Donors can only access tracking information for their own donations.',
            },
          ]);
        }
      }
      // For blood banks, only allow access to their own units
      else if (user.role === UserRole.BLOOD_BANK) {
        if (
          donation.bloodBank &&
          (!user._id || donation.bloodBank.toString() !== user._id.toString())
        ) {
          throw new ApiException([
            {
              field: 'donationId',
              message:
                'You do not have permission to view this blood unit tracking information',
            },
          ]);
        }
      }
      // Medical institutions access is limited unless a blood unit is dispatched to them
      else if (user.role === UserRole.MEDICAL_INSTITUTION) {
        const isAssociated = donation.dispatchedTo === (user._id as string);

        if (!isAssociated) {
          throw new ApiException([
            {
              field: 'donationId',
              message:
                'This medical institution does not have permission to view this blood unit',
            },
          ]);
        }
      }
    }

    return {
      donationId: donation._id,
      bloodType: donation.bloodType,
      volumeCollected: donation.volumeCollected,
      donationType: donation.donationType,
      donationDate: donation.donationDate,
      expiryDate: donation.expiryDate,
      unitStatus: donation.unitStatus,
      dispatchedAt: donation.dispatchedAt,
      dispatchedTo: donation.dispatchedTo,
      usedAt: donation.usedAt,
      usedFor: donation.usedFor,
      discardedAt: donation.discardedAt,
      discardReason: donation.discardReason,
      reservedForRequest: donation.reservedForRequest,
      donor: donation.donor,
      bloodBank: donation.bloodBank,
      isExpired: donation.expiryDate ? donation.expiryDate < new Date() : false,
      daysUntilExpiry: donation.expiryDate
        ? Math.ceil(
            (donation.expiryDate.getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
    };
  }

  // Private helper methods for blood unit management

  /**
   * Validate blood unit status transitions
   */
  private async validateStatusTransition(
    currentStatus: BloodUnitStatus | undefined,
    newStatus: BloodUnitStatus,
  ): Promise<void> {
    const validTransitions: Record<BloodUnitStatus, BloodUnitStatus[]> = {
      [BloodUnitStatus.IN_INVENTORY]: [
        BloodUnitStatus.RESERVED,
        BloodUnitStatus.DISPATCHED,
        BloodUnitStatus.DISCARDED,
        BloodUnitStatus.EXPIRED,
        BloodUnitStatus.QUARANTINED,
      ],
      [BloodUnitStatus.RESERVED]: [
        BloodUnitStatus.DISPATCHED,
        BloodUnitStatus.IN_INVENTORY, // Corrected formatting
        BloodUnitStatus.DISCARDED,
        BloodUnitStatus.EXPIRED,
        BloodUnitStatus.QUARANTINED,
      ],
      [BloodUnitStatus.DISPATCHED]: [
        BloodUnitStatus.USED,
        BloodUnitStatus.DISCARDED,
      ],
      [BloodUnitStatus.USED]: [], // Terminal state
      [BloodUnitStatus.EXPIRED]: [], // Terminal state
      [BloodUnitStatus.DISCARDED]: [], // Terminal state
      [BloodUnitStatus.QUARANTINED]: [
        BloodUnitStatus.IN_INVENTORY,
        BloodUnitStatus.DISCARDED,
      ],
    };

    // If no current status, allow any status (initial state)
    if (!currentStatus) {
      return;
    }

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ApiException([
        {
          field: 'unitStatus',
          message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        },
      ]);
    }
  }

  /**
   * Calculate expiry date based on donation type
   */
  private calculateExpiryDate(donationDate: Date, donationType?: string): Date {
    const expiryDate = new Date(donationDate);

    // Default shelf life in days based on donation type
    const shelfLifeDays: Record<string, number> = {
      whole_blood: 42,
      red_cells: 42,
      platelets: 5,
      plasma: 365,
      white_cells: 1,
      stem_cells: 365,
      bone_marrow: 1,
      cord_blood: 365,
    };

    const days =
      shelfLifeDays[donationType?.toLowerCase() || 'whole_blood'] || 42;
    expiryDate.setDate(expiryDate.getDate() + days);

    return expiryDate;
  }

  /**
   * Find suitable blood units for a blood request
   */
  async findSuitableBloodUnitsForRequest(
    bloodType: string,
    rhFactor: string,
    unitsNeeded: number,
    bloodBankId?: string,
    user?: Partial<UserDocument>,
  ): Promise<Donation[]> {
    // Base query for suitable blood units
    let query: any = {
      status: DonationStatus.COMPLETED,
      unitStatus: BloodUnitStatus.IN_INVENTORY,
      bloodType: `${bloodType}${rhFactor}`,
      expiryDate: { $gt: new Date() }, // Not expired
    };

    // Add blood bank filter if specified
    if (bloodBankId) {
      query.bloodBank = bloodBankId;
    }

    // Apply access control if user context is provided
    if (user && user._id && user.role) {
      // For blood banks, only include their own units
      if (user.role === UserRole.BLOOD_BANK) {
        query.bloodBank = user._id as string;
      }
      // For other roles (except admin), use buildAccessFilter
      else if (user.role !== UserRole.ADMIN) {
        const accessFilter = this.resourceProtection.buildAccessFilter(
          user,
          'donation',
        );
        query = { ...query, ...accessFilter };
      }
    }

    // Find suitable units, prioritizing older units (FIFO - First In, First Out)
    const suitableUnits = await this.donationModel
      .find(query)
      .sort({ donationDate: 1 }) // Oldest first
      .limit(unitsNeeded)
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName')
      .exec();

    return suitableUnits;
  }

  /**
   * Reserve multiple blood units for a blood request
   */
  async reserveBloodUnitsForRequest(
    donationIds: string[],
    requestId: string,
    user?: Partial<UserDocument>,
  ): Promise<Donation[]> {
    const reservedUnits: Donation[] = [];

    for (const donationId of donationIds) {
      try {
        const reservedUnit = await this.reserveForRequest(
          donationId,
          requestId,
          user,
        );
        reservedUnits.push(reservedUnit);
      } catch (error) {
        console.error(`Failed to reserve blood unit ${donationId}:`, error);
        // Continue with other units even if one fails
      }
    }

    // Log the batch reservation activity
    if (reservedUnits.length > 0) {
      await this.adminService.logActivity({
        activityType: ActivityType.BLOOD_REQUEST,
        title: 'Blood Units Reserved for Request',
        description: `${reservedUnits.length} blood units reserved for blood request`,
        userId: 'system',
        metadata: {
          requestId,
          reservedUnits: reservedUnits.length,
          donationIds: reservedUnits.map((unit) =>
            (unit as any)._id.toString(),
          ),
          reservedAt: new Date(),
        },
      });
    }

    return reservedUnits;
  }

  /**
   * Auto-fulfill blood request with available blood units
   */
  async autoFulfillBloodRequest(
    requestId: string,
    bloodType: string,
    rhFactor: string,
    unitsNeeded: number,
    bloodBankId?: string,
    user?: Partial<UserDocument>,
  ): Promise<{
    success: boolean;
    reservedUnits: Donation[];
    message: string;
  }> {
    try {
      // Find suitable blood units, passing user context for access control
      const suitableUnits = await this.findSuitableBloodUnitsForRequest(
        bloodType,
        rhFactor,
        unitsNeeded,
        bloodBankId,
        user,
      );

      if (suitableUnits.length === 0) {
        return {
          success: false,
          reservedUnits: [],
          message: 'No suitable blood units available for this request',
        };
      }

      if (suitableUnits.length < unitsNeeded) {
        // Partial fulfillment
        const reservedUnits = await this.reserveBloodUnitsForRequest(
          suitableUnits.map((unit) => (unit as any)._id.toString()),
          requestId,
        );

        return {
          success: false,
          reservedUnits,
          message: `Partial fulfillment: ${reservedUnits.length} of ${unitsNeeded} units reserved`,
        };
      }

      // Full fulfillment
      const unitsToReserve = suitableUnits.slice(0, unitsNeeded);
      const reservedUnits = await this.reserveBloodUnitsForRequest(
        unitsToReserve.map((unit) => (unit as any)._id.toString()),
        requestId,
      );

      return {
        success: true,
        reservedUnits,
        message: `Successfully reserved ${reservedUnits.length} blood units for the request`,
      };
    } catch (error) {
      console.error('Error in auto-fulfilling blood request:', error);
      return {
        success: false,
        reservedUnits: [],
        message: `Error fulfilling request: ${error.message}`,
      };
    }
  }
}
