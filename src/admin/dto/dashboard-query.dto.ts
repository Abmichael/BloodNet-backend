import { IsOptional, IsString, IsEnum, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class DashboardQueryDto {
  @IsOptional()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class RecentActivitiesQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['donation', 'registration', 'approval', 'rejection', 'emergency', 'alert'])
  activityType?: string;

  @IsOptional()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;
}

export class BloodInventoryQueryDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  bloodBankId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  criticalOnly?: boolean;
}

export class MonthlyTrendsQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  months?: number = 6;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  year?: number;
}

export class AlertsQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['critical', 'warning', 'info'])
  severity?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isResolved?: boolean;
}

export class ResolveAlertDto {
  @IsString()
  resolvedBy: string;

  @IsString()
  resolution: string;
}
