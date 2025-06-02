import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ApplicationStatus } from './entities/application.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { QueryFilter, ExtendedQueryString } from '../common/filters/query';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(createApplicationDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(@Query() query: ExtendedQueryString) {
    const baseQuery = this.applicationsService.findAll();

    const filter = new QueryFilter(baseQuery, query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    return await filter.getResults();
  }

  @Roles(UserRole.ADMIN)
  @Get('statistics')
  async getStatistics() {
    return this.applicationsService.getStatistics();
  }

  @Roles(UserRole.ADMIN)
  @Get('status/:status')
  async findByStatus(@Param('status') status: ApplicationStatus) {
    return this.applicationsService.findByStatus(status);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/review')
  async review(
    @Param('id') id: string,
    @Body() reviewDto: ReviewApplicationDto,
    @Req() req: any,
  ) {
    return this.applicationsService.review(id, reviewDto, req.user._id);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.applicationsService.remove(id);
  }
}
