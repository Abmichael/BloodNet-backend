import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';

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
}
