import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Donation } from '../donation/entities/donation.entity';
import {
  BloodRequest,
  RequestStatus,
} from '../blood-request/entities/blood-request.entity';
import { BloodBank } from '../blood-bank/entities/blood-bank.entity';
import { Application } from '../applications/entities/application.entity';
import { ActivityLog, ActivityType } from './entities/activity-log.entity';
import { Alert, AlertSeverity, AlertType } from './entities/alert.entity';
import {
  DashboardQueryDto,
  RecentActivitiesQueryDto,
  BloodInventoryQueryDto,
  MonthlyTrendsQueryDto,
  AlertsQueryDto,
  ResolveAlertDto,
} from './dto/dashboard-query.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Donation.name) private readonly donationModel: Model<Donation>,
    @InjectModel(BloodRequest.name)
    private readonly bloodRequestModel: Model<BloodRequest>,
    @InjectModel(BloodBank.name)
    private readonly bloodBankModel: Model<BloodBank>,
    @InjectModel(Application.name)
    private readonly applicationModel: Model<Application>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
    @InjectModel(Alert.name) private readonly alertModel: Model<Alert>,
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
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
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
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
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

  // Dashboard Quick Stats
  async getQuickStats(query: DashboardQueryDto) {
    const { dateRange } = query;
    let matchCondition = {};

    if (dateRange?.startDate && dateRange?.endDate) {
      matchCondition = {
        createdAt: {
          $gte: new Date(dateRange.startDate),
          $lte: new Date(dateRange.endDate),
        },
      };
    }

    const [
      totalDonors,
      totalDonations,
      pendingRequests,
      criticalAlerts,
      completedDonations,
      activeBloodBanks,
      emergencyRequests,
      recentActivities,
    ] = await Promise.all([
      this.userModel.countDocuments({ role: 'donor', ...matchCondition }),
      this.donationModel.countDocuments(matchCondition),
      this.bloodRequestModel.countDocuments({
        status: RequestStatus.PENDING,
        ...matchCondition,
      }),
      this.alertModel.countDocuments({
        severity: AlertSeverity.CRITICAL,
        resolved: false,
      }),
      this.donationModel.countDocuments({
        status: 'completed',
        ...matchCondition,
      }),
      this.bloodBankModel.countDocuments({ isActive: true }),
      this.bloodRequestModel.countDocuments({
        urgency: 'emergency',
        status: RequestStatus.PENDING,
      }),
      this.activityLogModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Calculate success rate
    const successRate =
      totalDonations > 0
        ? Math.round((completedDonations / totalDonations) * 100)
        : 0;

    return {
      summary: {
        totalDonors,
        totalDonations,
        successRate,
        activeBloodBanks,
      },
      alerts: {
        pendingRequests,
        criticalAlerts,
        emergencyRequests,
      },
      activity: {
        recentActivities,
        last24Hours: recentActivities,
      },
    };
  }

  // Recent Activities Feed
  async getRecentActivities(query: RecentActivitiesQueryDto) {
    const { page = 1, limit = 10, activityType, dateRange } = query;
    const skip = (page - 1) * limit;

    let matchCondition: any = {};

    if (activityType) {
      matchCondition.activityType = activityType;
    }

    if (dateRange?.startDate && dateRange?.endDate) {
      matchCondition.createdAt = {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate),
      };
    }

    const [activities, total] = await Promise.all([
      this.activityLogModel
        .find(matchCondition)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.activityLogModel.countDocuments(matchCondition),
    ]);
    return {
      activities: activities.map((activity) => ({
        id: activity._id,
        type: activity.activityType,
        title: activity.title,
        description: activity.description,
        user: activity.userId,
        metadata: activity.metadata,
        timestamp: (activity as any).createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  // Enhanced Blood Inventory Management with Dispatch Tracking
  async getBloodInventory(query: BloodInventoryQueryDto) {
    const { bloodBankId, location } = query;

    // Get completed donations with dispatch status
    const donations = await this.donationModel
      .find({ status: 'completed' })
      .populate('donor', 'bloodType')
      .populate('bloodBank', 'name location')
      .lean();

    // Process inventory data in memory
    const inventoryMap = new Map();

    donations.forEach((donation: any) => {
      if (!donation.donor?.bloodType || !donation.bloodBank) return;

      const key = `${donation.donor.bloodType}-${donation.bloodBank._id}`;

      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, {
          bloodType: donation.donor.bloodType,
          bloodBankId: donation.bloodBank._id,
          bloodBankName: donation.bloodBank.name,
          location: donation.bloodBank.location?.city || 'Unknown',
          totalUnits: 0,
          availableUnits: 0,
          reservedUnits: 0,
          dispatchedUnits: 0,
          expiredUnits: 0,
          discardedUnits: 0,
        });
      }

      const item = inventoryMap.get(key);
      item.totalUnits += 1;

      // Check dispatch status and shelf life
      const donationDate = new Date(donation.donationDate);
      const daysSinceDonation =
        (Date.now() - donationDate.getTime()) / (24 * 60 * 60 * 1000);

      const unitStatus = donation.unitStatus || 'in_inventory';

      // Count by status
      switch (unitStatus) {
        case 'in_inventory':
          if (daysSinceDonation <= 35) {
            item.availableUnits += 1;
          } else {
            item.expiredUnits += 1;
          }
          break;
        case 'reserved':
          if (daysSinceDonation <= 35) {
            item.reservedUnits += 1;
          } else {
            item.expiredUnits += 1;
          }
          break;
        case 'dispatched':
        case 'used':
          item.dispatchedUnits += 1;
          break;
        case 'expired':
        case 'discarded':
        case 'quarantined':
          item.expiredUnits += 1;
          break;
      }
    });
    const inventoryData = Array.from(inventoryMap.values())
      .filter((item) => {
        if (bloodBankId && item.bloodBankId.toString() !== bloodBankId)
          return false;
        if (
          location &&
          !item.location.toLowerCase().includes(location.toLowerCase())
        )
          return false;
        return true;
      })
      .map((item) => ({
        ...item,
        status:
          item.availableUnits < 5
            ? 'critical'
            : item.availableUnits < 15
              ? 'low'
              : 'adequate',
        // Add utilization metrics
        utilizationRate:
          item.totalUnits > 0
            ? Math.round((item.dispatchedUnits / item.totalUnits) * 100)
            : 0,
        expiryRate:
          item.totalUnits > 0
            ? Math.round((item.expiredUnits / item.totalUnits) * 100)
            : 0,
      })); // Group by blood type for summary
    const bloodTypesSummary = inventoryData.reduce((acc, item) => {
      const bloodType = item.bloodType;
      if (!acc[bloodType]) {
        acc[bloodType] = {
          bloodType,
          totalUnits: 0,
          availableUnits: 0,
          reservedUnits: 0,
          dispatchedUnits: 0,
          expiredUnits: 0,
          locations: [],
        };
      }
      acc[bloodType].totalUnits += item.totalUnits;
      acc[bloodType].availableUnits += item.availableUnits;
      acc[bloodType].reservedUnits += item.reservedUnits;
      acc[bloodType].dispatchedUnits += item.dispatchedUnits;
      acc[bloodType].expiredUnits += item.expiredUnits;
      acc[bloodType].locations.push({
        location: item.location,
        bloodBankId: item.bloodBankId,
        bloodBankName: item.bloodBankName,
        units: item.availableUnits,
        reserved: item.reservedUnits,
        dispatched: item.dispatchedUnits,
        expired: item.expiredUnits,
        utilizationRate: item.utilizationRate,
        expiryRate: item.expiryRate,
      });
      return acc;
    }, {});

    return {
      summary: Object.values(bloodTypesSummary),
      byLocation: inventoryData,
    };
  }

  // Monthly Trends with proper type handling
  async getMonthlyTrends(query: MonthlyTrendsQueryDto) {
    const { year = new Date().getFullYear(), months = 12 } = query;
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year + 1}-01-01`);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Simple aggregations with proper typing
    const [donationsData, requestsData, usersData] = await Promise.all([
      this.donationModel.aggregate([
        { $match: { donationDate: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: { $month: '$donationDate' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      this.bloodRequestModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      this.userModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Format data for charts
    const formatMonthlyData = (data: any[]) => {
      const monthlyData = Array(12).fill(0);
      data.forEach((item) => {
        monthlyData[item._id - 1] = item.count;
      });
      return monthlyData.slice(0, months);
    };

    return {
      labels: monthNames.slice(0, months),
      donations: formatMonthlyData(donationsData),
      requests: formatMonthlyData(requestsData),
      users: formatMonthlyData(usersData),
    };
  }

  // Regional Distribution
  async getRegionalDistribution() {
    const donations = await this.donationModel
      .find()
      .populate('bloodBank', 'location')
      .lean();

    const regionMap = new Map();

    donations.forEach((donation: any) => {
      const state = donation.bloodBank?.location?.state || 'Unknown';

      if (!regionMap.has(state)) {
        regionMap.set(state, {
          region: state,
          donations: 0,
          bloodBanks: new Set(),
        });
      }

      const item = regionMap.get(state);
      item.donations += 1;
      item.bloodBanks.add(donation.bloodBank?._id?.toString());
    });

    return Array.from(regionMap.values())
      .map((item) => ({
        region: item.region,
        donations: item.donations,
        bloodBanks: item.bloodBanks.size,
        percentage: 0, // Will be calculated on frontend
      }))
      .sort((a, b) => b.donations - a.donations);
  }

  // Alert Management
  async getAlerts(query: AlertsQueryDto) {
    const { page = 1, limit = 10, severity, type, isResolved } = query;
    const skip = (page - 1) * limit;

    let matchCondition: any = {};

    if (severity) {
      matchCondition.severity = severity;
    }

    if (type) {
      matchCondition.type = type;
    }

    if (typeof isResolved === 'boolean') {
      matchCondition.resolved = isResolved;
    }

    const [alerts, total] = await Promise.all([
      this.alertModel
        .find(matchCondition)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.alertModel.countDocuments(matchCondition),
    ]);
    return {
      alerts: alerts.map((alert) => ({
        id: alert._id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata,
        isResolved: alert.resolved,
        resolvedAt: alert.resolvedAt,
        resolvedBy: alert.resolvedBy,
        createdAt: (alert as any).createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async resolveAlert(alertId: string, resolveData: ResolveAlertDto) {
    const alert = await this.alertModel.findByIdAndUpdate(
      alertId,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: resolveData.resolvedBy,
        resolution: resolveData.resolution,
      },
      { new: true },
    );

    if (!alert) {
      throw new Error('Alert not found');
    }

    // Log the resolution activity
    await this.logActivity({
      activityType: ActivityType.ALERT,
      title: 'Alert Resolved',
      description: `Alert resolved: ${alert.title}`,
      userId: resolveData.resolvedBy,
      metadata: { alertId, resolution: resolveData.resolution },
    });

    return alert;
  }

  // Activity logging helper
  async logActivity(activityData: {
    activityType: ActivityType;
    title: string;
    description?: string;
    userId?: string;
    metadata?: any;
  }) {
    const activity = new this.activityLogModel(activityData);
    return activity.save();
  }

  // Alert generation helper
  async createAlert(alertData: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    metadata?: any;
  }) {
    const alert = new this.alertModel(alertData);
    const savedAlert = await alert.save();

    // Log alert creation
    await this.logActivity({
      activityType: ActivityType.ALERT,
      title: 'Alert Created',
      description: `New ${alertData.severity} alert: ${alertData.title}`,
      metadata: { alertId: savedAlert._id.toString(), ...alertData.metadata },
    });

    return savedAlert;
  }

  // Background job to check for critical inventory levels
  async checkInventoryAlerts() {
    const criticalThreshold = 5;
    const lowThreshold = 15;

    const inventoryData = await this.getBloodInventory({});

    for (const item of inventoryData.byLocation) {
      if (item.availableUnits <= criticalThreshold) {
        await this.createAlert({
          type: AlertType.INVENTORY_CRITICAL,
          severity: AlertSeverity.CRITICAL,
          title: 'Critical Blood Inventory Level',
          message: `${item.bloodType} blood inventory at ${item.bloodBankName} is critically low (${item.availableUnits} units)`,
          metadata: {
            bloodType: item.bloodType,
            bloodBankId: item.bloodBankId,
            bloodBankName: item.bloodBankName,
            availableUnits: item.availableUnits,
            location: item.location,
          },
        });
      } else if (item.availableUnits <= lowThreshold) {
        await this.createAlert({
          type: AlertType.INVENTORY_CRITICAL,
          severity: AlertSeverity.WARNING,
          title: 'Low Blood Inventory Level',
          message: `${item.bloodType} blood inventory at ${item.bloodBankName} is running low (${item.availableUnits} units)`,
          metadata: {
            bloodType: item.bloodType,
            bloodBankId: item.bloodBankId,
            bloodBankName: item.bloodBankName,
            availableUnits: item.availableUnits,
            location: item.location,
          },
        });
      }
    }
  }
}
