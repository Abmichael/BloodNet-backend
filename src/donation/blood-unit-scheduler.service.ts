import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DonationService } from '../donation/donation.service';
import { NotificationHelperService } from '../notifications/notification-helper.service';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';

@Injectable()
export class BloodUnitSchedulerService {
  private readonly logger = new Logger(BloodUnitSchedulerService.name);

  constructor(
    private readonly donationService: DonationService,
    private readonly notificationHelper: NotificationHelperService,
    private readonly adminService: AdminService,
  ) {}

  /**
   * Process expired blood units daily at 6 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processExpiredBloodUnits() {
    this.logger.log('Starting daily expired blood units processing...');

    try {
      const result = await this.donationService.processExpiredBloodUnits();
      
      this.logger.log(
        `Processed ${result.processed} expired blood units out of ${result.units.length} total expired units`
      );      // Log the activity
      await this.adminService.logActivity({
        activityType: ActivityType.INVENTORY_UPDATE,
        title: 'Expired Blood Units Processed',
        description: `Automatically processed ${result.processed} expired blood units`,
        userId: 'system',
        metadata: {
          processedCount: result.processed,
          totalExpiredCount: result.units.length,
          processedAt: new Date(),
        },
      });

      // If there were any expired units, potentially notify administrators
      if (result.processed > 0) {
        this.logger.warn(`${result.processed} blood units were marked as expired`);
      }

    } catch (error) {
      this.logger.error('Error processing expired blood units:', error);      // Log the error activity
      await this.adminService.logActivity({
        activityType: ActivityType.ALERT,
        title: 'Expired Blood Units Processing Failed',
        description: `Failed to process expired blood units: ${error.message}`,
        userId: 'system',
        metadata: {
          error: error.message,
          errorAt: new Date(),
        },
      });
    }
  }

  /**
   * Check for blood units expiring soon (every day at 8 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringBloodUnits() {
    this.logger.log('Checking for blood units expiring soon...');

    try {
      // Check for units expiring in the next 3 days
      const expiringUnits = await this.donationService.getBloodUnitsExpiringSoon(3);
      
      if (expiringUnits.length > 0) {
        this.logger.warn(`${expiringUnits.length} blood units are expiring within 3 days`);        // Log the warning activity
        await this.adminService.logActivity({
          activityType: ActivityType.INVENTORY_UPDATE,
          title: 'Blood Units Expiring Soon',
          description: `${expiringUnits.length} blood units are expiring within 3 days`,
          userId: 'system',
          metadata: {
            expiringCount: expiringUnits.length,
            checkedAt: new Date(),
            expiringUnits: expiringUnits.map(unit => ({
              id: (unit as any)._id,
              bloodType: unit.bloodType,
              expiryDate: unit.expiryDate,
              bloodBank: unit.bloodBank,
            })),
          },
        });

        // Group by blood bank for notifications
        const unitsByBloodBank = expiringUnits.reduce((acc, unit) => {
          const bloodBankId = (unit.bloodBank as any)?._id?.toString() || 'unknown';
          if (!acc[bloodBankId]) {
            acc[bloodBankId] = [];
          }
          acc[bloodBankId].push(unit);
          return acc;
        }, {} as Record<string, typeof expiringUnits>);

        // You could extend this to send notifications to blood bank administrators
        this.logger.log(
          `Expiring units grouped by blood bank: ${Object.keys(unitsByBloodBank).length} blood banks affected`
        );
      }

    } catch (error) {
      this.logger.error('Error checking expiring blood units:', error);
    }
  }

  /**
   * Generate weekly blood inventory report (every Monday at 9 AM)
   */
  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_9AM)
  async generateWeeklyInventoryReport() {
    this.logger.log('Generating weekly blood inventory report...');

    try {      // Get overall inventory status
      const inventoryStats = await this.adminService.getBloodInventory({});
      
      const totalAvailable = inventoryStats.byLocation.reduce((sum: number, item: any) => sum + item.availableUnits, 0);
      const totalExpired = inventoryStats.byLocation.reduce((sum: number, item: any) => sum + item.expiredUnits, 0);
      const totalDispatched = inventoryStats.byLocation.reduce((sum: number, item: any) => sum + item.dispatchedUnits, 0);

      // Log the weekly report
      await this.adminService.logActivity({
        activityType: ActivityType.INVENTORY_UPDATE,
        title: 'Weekly Blood Inventory Report',
        description: `Weekly inventory summary: ${totalAvailable} available, ${totalExpired} expired, ${totalDispatched} dispatched`,
        userId: 'system',
        metadata: {
          totalAvailable,
          totalExpired,
          totalDispatched,
          inventoryByType: inventoryStats,
          reportDate: new Date(),
        },
      });

      this.logger.log(
        `Weekly report generated: ${totalAvailable} available units, ${totalExpired} expired units`
      );

    } catch (error) {
      this.logger.error('Error generating weekly inventory report:', error);
    }
  }
}
