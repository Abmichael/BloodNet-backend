import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDonationScheduleDto } from './dto/create-donation-schedule.dto';
import { UpdateDonationScheduleDto } from './dto/update-donation-schedule.dto';
import {
  DonationSchedule,
  DonationScheduleDocument,
  ScheduleStatus,
} from './entities/donation-schedule.entity';
import { ApiException } from '../common/filters/exception';
import { NotificationHelperService } from '../notifications/notification-helper.service';
import { BloodBankService } from '../blood-bank/blood-bank.service';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';

@Injectable()
export class DonationScheduleService {
  constructor(
    @InjectModel(DonationSchedule.name)
    private donationScheduleModel: Model<DonationScheduleDocument>,
    private notificationHelper: NotificationHelperService,
    private bloodBankService: BloodBankService,
    private adminService: AdminService,
  ) {}

  async create(
    createDonationScheduleDto: CreateDonationScheduleDto,
  ): Promise<DonationSchedule> {
    // Validate donor and blood bank exist (you may want to inject their services)
    if (!Types.ObjectId.isValid(createDonationScheduleDto.donor)) {
      throw new ApiException([
        { field: 'donor', message: 'Invalid donor ID format' },
      ]);
    }

    if (!Types.ObjectId.isValid(createDonationScheduleDto.bloodBank)) {
      throw new ApiException([
        { field: 'bloodBank', message: 'Invalid blood bank ID format' },
      ]);
    }

    // Check for scheduling conflicts
    await this.checkSchedulingConflicts(
      createDonationScheduleDto.donor,
      createDonationScheduleDto.bloodBank,
      createDonationScheduleDto.scheduledDate,
      createDonationScheduleDto.timeSlot,
    ); // Validate scheduled date is in the future
    const now = new Date();
    if (new Date(createDonationScheduleDto.scheduledDate) <= now) {
      throw new ApiException([
        {
          field: 'scheduledDate',
          message: 'Scheduled date must be in the future',
        },
      ]);
    }

    const createdSchedule = new this.donationScheduleModel(
      createDonationScheduleDto,
    );
    const savedSchedule = await createdSchedule.save();

    // Log donation scheduling activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.DONATION_SCHEDULED,
        title: 'Donation Appointment Scheduled',
        description: `Donation appointment scheduled for ${new Date(createDonationScheduleDto.scheduledDate).toLocaleDateString()} at ${createDonationScheduleDto.timeSlot}`,
        userId: createDonationScheduleDto.donor,
        metadata: {
          scheduleId: (savedSchedule as any)._id.toString(),
          donorId: createDonationScheduleDto.donor,
          bloodBankId: createDonationScheduleDto.bloodBank,
          scheduledDate: createDonationScheduleDto.scheduledDate,
          timeSlot: createDonationScheduleDto.timeSlot,
          scheduledBy: createDonationScheduleDto.scheduledBy,
          status: ScheduleStatus.SCHEDULED,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log donation scheduling activity:', error);
    }

    // Schedule appointment reminder notification
    await this.scheduleAppointmentReminder(savedSchedule);

    return savedSchedule;
  }

  findAll() {
    return this.donationScheduleModel
      .find()
      .populate('donor', 'firstName lastName phoneNumber')
      .populate('bloodBank', 'name address location')
      .populate('scheduledBy', 'username email')
      .populate('completedDonation')
      .sort({ scheduledDate: 1 });
  }

  async findOne(id: string): Promise<DonationSchedule> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiException([
        { field: 'id', message: 'Invalid donation schedule ID format' },
      ]);
    }

    const schedule = await this.donationScheduleModel
      .findById(id)
      .populate('donor', 'firstName lastName phoneNumber email')
      .populate('bloodBank', 'name address location contactNumber')
      .populate('scheduledBy', 'username email')
      .populate('completedDonation')
      .exec();

    if (!schedule) {
      throw new ApiException([
        { field: 'id', message: `Donation schedule with ID ${id} not found` },
      ]);
    }

    return schedule;
  }

  async update(
    id: string,
    updateDonationScheduleDto: UpdateDonationScheduleDto,
  ): Promise<DonationSchedule> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiException([
        { field: 'id', message: 'Invalid donation schedule ID format' },
      ]);
    }

    // Check if schedule exists
    const existingSchedule = await this.donationScheduleModel.findById(id);
    if (!existingSchedule) {
      throw new ApiException([
        { field: 'id', message: `Donation schedule with ID ${id} not found` },
      ]);
    }

    // If updating scheduled date or time, check for conflicts
    if (
      updateDonationScheduleDto.scheduledDate ||
      updateDonationScheduleDto.timeSlot
    ) {
      const scheduledDate =
        updateDonationScheduleDto.scheduledDate ||
        existingSchedule.scheduledDate;
      const timeSlot =
        updateDonationScheduleDto.timeSlot || existingSchedule.timeSlot;

      await this.checkSchedulingConflicts(
        existingSchedule.donor.toString(),
        existingSchedule.bloodBank.toString(),
        scheduledDate,
        timeSlot,
        id, // exclude current schedule from conflict check
      );
    }

    // Auto-set timestamps based on status changes
    if (updateDonationScheduleDto.status) {
      switch (updateDonationScheduleDto.status) {
        case ScheduleStatus.CONFIRMED:
          updateDonationScheduleDto.confirmedAt = new Date();
          break;
        case ScheduleStatus.CANCELLED:
          updateDonationScheduleDto.cancelledAt = new Date();
          break;
      }
    }

    const updatedSchedule = await this.donationScheduleModel
      .findByIdAndUpdate(id, updateDonationScheduleDto, { new: true })
      .populate('donor', 'firstName lastName phoneNumber')
      .populate('bloodBank', 'name address location')
      .populate('scheduledBy', 'username email')
      .populate('completedDonation')
      .exec();

    // Log status change activity
    if (updateDonationScheduleDto.status && existingSchedule.status !== updateDonationScheduleDto.status) {
      try {
        let activityType: ActivityType;
        let title: string;
        let description: string;

        switch (updateDonationScheduleDto.status) {
          case ScheduleStatus.CONFIRMED:
            activityType = ActivityType.DONATION_SCHEDULED;
            title = 'Donation Appointment Confirmed';
            description = `Donation appointment confirmed for ${new Date(updatedSchedule!.scheduledDate).toLocaleDateString()}`;
            break;
          case ScheduleStatus.CANCELLED:
            activityType = ActivityType.DONATION_CANCELLED;
            title = 'Donation Appointment Cancelled';
            description = `Donation appointment cancelled. Reason: ${updateDonationScheduleDto.cancellationReason || 'Not specified'}`;
            break;
          case ScheduleStatus.COMPLETED:
            activityType = ActivityType.DONATION_COMPLETED;
            title = 'Donation Appointment Completed';
            description = 'Donation appointment completed successfully';
            break;
          default:
            activityType = ActivityType.DONATION_SCHEDULED;
            title = 'Donation Schedule Updated';
            description = `Donation schedule status changed from ${existingSchedule.status} to ${updateDonationScheduleDto.status}`;
        }

        await this.adminService.logActivity({
          activityType,
          title,
          description,
          userId: existingSchedule.donor.toString(),
          metadata: {
            scheduleId: id,
            donorId: existingSchedule.donor.toString(),
            bloodBankId: existingSchedule.bloodBank.toString(),
            previousStatus: existingSchedule.status,
            newStatus: updateDonationScheduleDto.status,
            scheduledDate: updatedSchedule!.scheduledDate,
            timeSlot: updatedSchedule!.timeSlot,
            cancellationReason: updateDonationScheduleDto.cancellationReason,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to log donation schedule update activity:', error);
      }
    }

    return updatedSchedule!;
  }

  async remove(id: string): Promise<DonationSchedule> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiException([
        { field: 'id', message: 'Invalid donation schedule ID format' },
      ]);
    }

    const deletedSchedule = await this.donationScheduleModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedSchedule) {
      throw new ApiException([
        { field: 'id', message: `Donation schedule with ID ${id} not found` },
      ]);
    }

    // Log schedule deletion activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.DONATION_CANCELLED,
        title: 'Donation Schedule Deleted',
        description: `Donation schedule removed from system`,
        userId: deletedSchedule.donor.toString(),
        metadata: {
          scheduleId: id,
          donorId: deletedSchedule.donor.toString(),
          bloodBankId: deletedSchedule.bloodBank.toString(),
          scheduledDate: deletedSchedule.scheduledDate,
          timeSlot: deletedSchedule.timeSlot,
          previousStatus: deletedSchedule.status,
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log donation schedule deletion activity:', error);
    }

    return deletedSchedule;
  }

  // Find schedules by donor
  findByDonor(donorId: string) {
    if (!Types.ObjectId.isValid(donorId)) {
      throw new ApiException([
        { field: 'donorId', message: 'Invalid donor ID format' },
      ]);
    }

    return this.donationScheduleModel
      .find({ donor: new Types.ObjectId(donorId) })
      .populate('bloodBank', 'name address location')
      .populate('completedDonation')
      .sort({ scheduledDate: 1 });
  }

  // Find schedules by blood bank
  findByBloodBank(bloodBankId: string) {
    if (!Types.ObjectId.isValid(bloodBankId)) {
      throw new ApiException([
        { field: 'bloodBankId', message: 'Invalid blood bank ID format' },
      ]);
    }

    return this.donationScheduleModel
      .find({ bloodBank: new Types.ObjectId(bloodBankId) })
      .populate('donor', 'firstName lastName phoneNumber')
      .populate('completedDonation')
      .sort({ scheduledDate: 1 });
  }

  // Find schedules by date range
  findByDateRange(startDate: Date, endDate: Date) {
    return this.donationScheduleModel
      .find({
        scheduledDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .populate('donor', 'firstName lastName phoneNumber')
      .populate('bloodBank', 'name address location')
      .sort({ scheduledDate: 1 });
  }

  // Find schedules by status
  findByStatus(status: ScheduleStatus) {
    return this.donationScheduleModel
      .find({ status })
      .populate('donor', 'firstName lastName phoneNumber')
      .populate('bloodBank', 'name address location')
      .sort({ scheduledDate: 1 });
  }

  // Find upcoming schedules (for reminders)
  async findUpcomingSchedules(hours: number = 24) {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this.donationScheduleModel
      .find({
        scheduledDate: {
          $gte: now,
          $lte: futureTime,
        },
        status: { $in: [ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED] },
        sendReminders: true,
      })
      .populate('donor', 'firstName lastName phoneNumber email')
      .populate('bloodBank', 'name address location contactNumber')
      .sort({ scheduledDate: 1 });
  }

  // Cancel schedule with reason
  async cancelSchedule(id: string, reason: string): Promise<DonationSchedule> {
    return this.update(id, {
      status: ScheduleStatus.CANCELLED,
      cancellationReason: reason,
      cancelledAt: new Date(),
    });
  }

  // Confirm schedule
  async confirmSchedule(id: string): Promise<DonationSchedule> {
    return this.update(id, {
      status: ScheduleStatus.CONFIRMED,
      confirmedAt: new Date(),
    });
  }

  // Mark as completed and link to donation
  async completeSchedule(
    id: string,
    donationId: string,
  ): Promise<DonationSchedule> {
    if (!Types.ObjectId.isValid(donationId)) {
      throw new ApiException([
        { field: 'donationId', message: 'Invalid donation ID format' },
      ]);
    }

    return this.update(id, {
      status: ScheduleStatus.COMPLETED,
      completedDonation: donationId,
    });
  }

  // Check for scheduling conflicts
  private async checkSchedulingConflicts(
    donorId: string,
    bloodBankId: string,
    scheduledDate: Date,
    timeSlot: string,
    excludeScheduleId?: string,
  ): Promise<void> {
    const query: any = {
      $or: [
        // Same donor at the same time
        {
          donor: new Types.ObjectId(donorId),
          scheduledDate,
          timeSlot,
          status: { $in: [ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED] },
        },
        // Same blood bank, same time slot (capacity check)
        {
          bloodBank: new Types.ObjectId(bloodBankId),
          scheduledDate,
          timeSlot,
          status: { $in: [ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED] },
        },
      ],
    };

    if (excludeScheduleId) {
      query._id = { $ne: new Types.ObjectId(excludeScheduleId) };
    }

    const conflictingSchedules = await this.donationScheduleModel.find(query);

    if (conflictingSchedules.length > 0) {
      // Check if it's a donor conflict or blood bank capacity conflict
      const donorConflict = conflictingSchedules.find(
        (s) => s.donor.toString() === donorId,
      );

      if (donorConflict) {
        throw new ApiException([
          {
            field: 'scheduledDate',
            message: 'Donor already has a schedule at this time',
          },
        ]);
      } else {
        // This could be expanded to check actual capacity limits
        throw new ApiException([
          {
            field: 'timeSlot',
            message: 'Time slot is already occupied at this blood bank',
          },
        ]);
      }
    }
  }

  // Get schedule statistics
  async getScheduleStats(bloodBankId?: string) {
    const matchStage: any = {};
    if (bloodBankId) {
      matchStage.bloodBank = new Types.ObjectId(bloodBankId);
    }

    const stats = await this.donationScheduleModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
  }
  private async scheduleAppointmentReminder(schedule: DonationSchedule) {
    try {
      // Get blood bank name from populated data or fetch it
      let bloodBankName = '';

      // Check if bloodBank is already populated
      if (
        schedule.bloodBank &&
        typeof schedule.bloodBank === 'object' &&
        (schedule.bloodBank as any).name
      ) {
        bloodBankName = (schedule.bloodBank as any).name;
      } else {
        // Fetch blood bank name if not populated
        try {
          const bloodBank = await this.bloodBankService.findOne(
            schedule.bloodBank.toString(),
          );
          bloodBankName = bloodBank.name;
        } catch (err) {
          bloodBankName = 'Blood Bank'; // Fallback name
          console.error('Error fetching blood bank details:', err);
        }
      }

      await this.notificationHelper.scheduleAppointmentReminders(
        schedule.donor.toString(),
        (schedule as any).id || (schedule as any)._id.toString(),
        schedule.scheduledDate,
        bloodBankName,
        schedule.timeSlot,
      );
    } catch (error) {
      console.error('Error scheduling appointment reminder:', error);
      // Don't throw here to prevent appointment creation from failing
    }
  }
}
