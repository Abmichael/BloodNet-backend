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

@Injectable()
export class DonationService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
    @Inject(forwardRef(() => DonorService)) private donorService: DonorService,
    private notificationHelper: NotificationHelperService,
    private bloodBankService: BloodBankService,
    @Inject(forwardRef(() => AdminService)) private adminService: AdminService,
  ) {}
  async create(createDonationDto: CreateDonationDto): Promise<Donation> {
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
  findAll() {
    return this.donationModel
      .find()
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber');
  }

  async assertDonorExists(donorId: string): Promise<void> {
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
  }

  findAllByDonorQuery(donorId: string) {
    return this.donationModel
      .find({ donor: new Types.ObjectId(donorId) })
      .sort({ donationDate: -1 })
      .populate('bloodBank', 'name location');
  }

  async findOne(id: string): Promise<Donation> {
    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiException([
        { field: 'id', message: `Invalid donation ID format: ${id}` },
      ]);
    }

    const donation = await this.donationModel
      .findById(id)
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber')
      .exec();

    if (!donation) {
      throw new ApiException([
        { field: 'id', message: `Donation with ID ${id} not found` },
      ]);
    }

    return donation;
    // Note: MongooseErrorInterceptor will automatically catch and process any Mongoose errors
  }
  async update(
    id: string,
    updateDonationDto: UpdateDonationDto,
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

  async remove(id: string): Promise<Donation> {
    // Validate ID format
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiException([
        { field: 'id', message: `Invalid donation ID format: ${id}` },
      ]);
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
  async getDonorStats(donorId: string): Promise<any> {
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
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.DISPATCHED,
      dispatchedTo: dispatchDto.dispatchedTo,
      dispatchedAt: dispatchDto.dispatchedAt || new Date().toISOString(),
    };

    if (dispatchDto.forRequest) {
      updateDto.reservedForRequest = dispatchDto.forRequest;
    }

    return this.updateBloodUnitStatus(donationId, updateDto);
  }

  /**
   * Mark blood unit as used for a patient
   */
  async markAsUsed(
    donationId: string,
    useDto: UseBloodUnitDto,
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.USED,
      usedFor: useDto.usedFor,
      usedAt: useDto.usedAt || new Date().toISOString(),
    };

    return this.updateBloodUnitStatus(donationId, updateDto);
  }

  /**
   * Mark blood unit as discarded
   */
  async markAsDiscarded(
    donationId: string,
    discardDto: DiscardBloodUnitDto,
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.DISCARDED,
      discardReason: discardDto.discardReason,
      discardedAt: discardDto.discardedAt || new Date().toISOString(),
    };

    return this.updateBloodUnitStatus(donationId, updateDto);
  }

  /**
   * Mark blood unit as expired
   */
  async markAsExpired(donationId: string): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.EXPIRED,
    };

    return this.updateBloodUnitStatus(donationId, updateDto);
  }

  /**
   * Reserve blood unit for a specific blood request
   */
  async reserveForRequest(
    donationId: string,
    requestId: string,
  ): Promise<Donation> {
    const updateDto: UpdateBloodUnitStatusDto = {
      unitStatus: BloodUnitStatus.RESERVED,
      reservedForRequest: requestId,
    };

    return this.updateBloodUnitStatus(donationId, updateDto);
  }

  /**
   * Get all blood units with a specific status
   */
  getBloodUnitsByStatus(status: BloodUnitStatus) {
    return this.donationModel
      .find({
        status: DonationStatus.COMPLETED,
        unitStatus: status,
      })
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber');
  }

  /**
   * Get expired blood units
   */
  getExpiredBloodUnits() {
    const now = new Date();
    return this.donationModel
      .find({
        status: DonationStatus.COMPLETED,
        unitStatus: {
          $in: [BloodUnitStatus.IN_INVENTORY, BloodUnitStatus.RESERVED],
        },
        expiryDate: { $lt: now },
      })
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber')
      .sort({ expiryDate: 1 });
  }

  /**
   * Get blood units expiring within a specified number of days
   */
  getBloodUnitsExpiringSoon(days: number = 3) {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + days);

    return this.donationModel
      .find({
        status: DonationStatus.COMPLETED,
        unitStatus: {
          $in: [BloodUnitStatus.IN_INVENTORY, BloodUnitStatus.RESERVED],
        },
        expiryDate: { $lte: expiryThreshold, $gte: new Date() },
      })
      .populate('bloodBank', 'name location')
      .populate('donor', 'firstName lastName phoneNumber')
      .sort({ expiryDate: 1 });
  }

  /**
   * Process expired blood units (mark as expired)
   */
  async processExpiredBloodUnits(): Promise<{
    processed: number;
    units: Donation[];
  }> {
    const expiredUnits = await this.getExpiredBloodUnits();

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
  async getBloodUnitTrackingInfo(donationId: string): Promise<any> {
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
        BloodUnitStatus.IN_INVENTORY, // Can be unreserved
        BloodUnitStatus.DISCARDED,
        BloodUnitStatus.EXPIRED,
        BloodUnitStatus.QUARANTINED,
      ],
      [BloodUnitStatus.DISPATCHED]: [
        BloodUnitStatus.USED,
        BloodUnitStatus.DISCARDED, // Can be returned and discarded
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
  ): Promise<Donation[]> {
    const query: any = {
      status: DonationStatus.COMPLETED,
      unitStatus: BloodUnitStatus.IN_INVENTORY,
      bloodType: `${bloodType}${rhFactor}`,
      expiryDate: { $gt: new Date() }, // Not expired
    };

    if (bloodBankId) {
      query.bloodBank = bloodBankId;
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
  ): Promise<Donation[]> {
    const reservedUnits: Donation[] = [];

    for (const donationId of donationIds) {
      try {
        const reservedUnit = await this.reserveForRequest(
          donationId,
          requestId,
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
  ): Promise<{
    success: boolean;
    reservedUnits: Donation[];
    message: string;
  }> {
    try {
      // Find suitable blood units
      const suitableUnits = await this.findSuitableBloodUnitsForRequest(
        bloodType,
        rhFactor,
        unitsNeeded,
        bloodBankId,
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
