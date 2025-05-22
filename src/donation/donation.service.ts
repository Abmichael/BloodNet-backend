import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import {
  Donation,
  DonationDocument,
} from './entities/donation.entity';
import { DonorService } from '../donor/donor.service';
import { ApiException, MongooseException } from '../common/filters/exception';
import { DonationStatus } from './donation.constants';

@Injectable()
export class DonationService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
    @Inject(forwardRef(() => DonorService)) private donorService: DonorService,
  ) {}
  async create(createDonationDto: CreateDonationDto): Promise<Donation> {
    // Check if donor exists
    if (createDonationDto.donor) {
      const donorExists = await this.donorService.findOne(
        createDonationDto.donor,
      );
      if (!donorExists) {
        throw new ApiException([
          {
            field: 'donor',
            message: `Donor with ID ${createDonationDto.donor} not found`,
          },
        ]);
      }
    }

    const createdDonation = new this.donationModel(createDonationDto);
    const savedDonation = await createdDonation.save();

    // Update donor's last donation date if the donation is completed
    if (createDonationDto.status === DonationStatus.COMPLETED) {
      await this.updateDonorOnDonation(savedDonation);
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

    // If donation status changed to COMPLETED, update donor
    if (
      previousDonation.status !== DonationStatus.COMPLETED &&
      updateDonationDto.status === DonationStatus.COMPLETED
    ) {
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
}
