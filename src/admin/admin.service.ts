import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Donation } from '../donation/entities/donation.entity';
import { BloodRequest, RequestStatus } from '../blood-request/entities/blood-request.entity';
import { BloodBank } from '../blood-bank/entities/blood-bank.entity';
import { Application } from '../applications/entities/application.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Donation.name) private readonly donationModel: Model<Donation>,
    @InjectModel(BloodRequest.name) private readonly bloodRequestModel: Model<BloodRequest>,
    @InjectModel(BloodBank.name) private readonly bloodBankModel: Model<BloodBank>,
    @InjectModel(Application.name) private readonly applicationModel: Model<Application>,
  ) {}

  async getKpis() {
    const [
      totalUsers,
      totalDonations,
      pendingRequests,
      approvedBloodBanks,
      rejectedApplications,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.donationModel.countDocuments(),
      this.bloodRequestModel.countDocuments({ status: RequestStatus.PENDING }),
      this.bloodBankModel.countDocuments({ isActive: true }),
      this.applicationModel.countDocuments({ status: 'rejected' }),
    ]);
    return {
      totalUsers,
      totalDonations,
      pendingRequests,
      approvedBloodBanks,
      rejectedApplications,
    };
  }

  async getDonationsPerMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const pipeline = [
      {
        $match: {
          donationDate: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$donationDate' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as 1 | -1 } },
    ];
    const result = await this.donationModel.aggregate(pipeline);
    const data = Array(12).fill(0);
    result.forEach((item) => {
      data[item._id - 1] = item.count;
    });
    return {
      labels: months,
      data,
    };
  }

  async getUserGrowth() {
    const now = new Date();
    const year = now.getFullYear();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const pipeline = [
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as 1 | -1 } },
    ];
    const result = await this.userModel.aggregate(pipeline);
    const data = Array(12).fill(0);
    result.forEach((item) => {
      data[item._id - 1] = item.count;
    });
    return {
      labels: months,
      data,
    };
  }
}
