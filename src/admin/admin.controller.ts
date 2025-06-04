import { Controller, Get, Post, Put, UseGuards, Query, Param, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { 
  DashboardQueryDto, 
  RecentActivitiesQueryDto, 
  BloodInventoryQueryDto, 
  MonthlyTrendsQueryDto, 
  AlertsQueryDto,
  ResolveAlertDto 
} from './dto/dashboard-query.dto';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('kpis')
  async getKpis() {
    return this.adminService.getKpis();
  }

  @Get('stats/donations-per-month')
  async getDonationsPerMonth() {
    return this.adminService.getDonationsPerMonth();
  }

  @Get('stats/user-growth')
  async getUserGrowth() {
    return this.adminService.getUserGrowth();
  }

  // Dashboard endpoints
  @Get('dashboard/quick-stats')
  async getQuickStats(@Query() query: DashboardQueryDto) {
    return this.adminService.getQuickStats(query);
  }

  @Get('dashboard/recent-activities')
  async getRecentActivities(@Query() query: RecentActivitiesQueryDto) {
    return this.adminService.getRecentActivities(query);
  }

  @Get('dashboard/blood-inventory')
  async getBloodInventory(@Query() query: BloodInventoryQueryDto) {
    return this.adminService.getBloodInventory(query);
  }

  @Get('dashboard/monthly-trends')
  async getMonthlyTrends(@Query() query: MonthlyTrendsQueryDto) {
    return this.adminService.getMonthlyTrends(query);
  }

  @Get('dashboard/regional-distribution')
  async getRegionalDistribution() {
    return this.adminService.getRegionalDistribution();
  }

  @Get('alerts')
  async getAlerts(@Query() query: AlertsQueryDto) {
    return this.adminService.getAlerts(query);
  }

  @Put('alerts/:id/resolve')
  async resolveAlert(@Param('id') id: string, @Body() resolveData: ResolveAlertDto) {
    return this.adminService.resolveAlert(id, resolveData);
  }

  @Post('alerts/check-inventory')
  async checkInventoryAlerts() {
    await this.adminService.checkInventoryAlerts();
    return { message: 'Inventory alerts check completed' };
  }
}
