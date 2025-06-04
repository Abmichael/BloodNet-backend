import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
  ApplicationRole,
} from './entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { UsersService } from '../users/users.service';
import { BloodBankService } from '../blood-bank/blood-bank.service';
import { MedicalInstitutionService } from '../medical-institution/medical-institution.service';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    private usersService: UsersService,
    private bloodBankService: BloodBankService,
    private medicalInstitutionService: MedicalInstitutionService,
    private adminService: AdminService,
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationDocument> {
    // Check if email already exists in applications
    const existingApplication = await this.applicationModel.findOne({
      email: createApplicationDto.email,
    });

    if (existingApplication) {
      throw new ConflictException('Application with this email already exists');
    }

    // Check if email already exists in users
    const existingUser = await this.usersService.findByEmail(
      createApplicationDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createApplicationDto.password, 10);

    // Create application
    const application = new this.applicationModel({
      ...createApplicationDto,
      password: hashedPassword,
    });

    const savedApplication = await application.save();

    // Log application submission activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.APPLICATION_SUBMITTED,
        title: `New ${createApplicationDto.role} Application Submitted`,
        description: `Application submitted for ${createApplicationDto.email} as ${createApplicationDto.role}`,
        metadata: {
          applicationId: (savedApplication as any)._id.toString(),
          email: createApplicationDto.email,
          role: createApplicationDto.role,
          applicantName: createApplicationDto.profileData?.name,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log application submission activity:', error);
    }

    return savedApplication;
  }

  findAll() {
    return this.applicationModel.find();
  }

  async findByStatus(status: ApplicationStatus) {
    return this.applicationModel.find({ status });
  }

  async findOne(id: string): Promise<ApplicationDocument> {
    const application = await this.applicationModel.findById(id);
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async review(
    id: string,
    reviewDto: ReviewApplicationDto,
    reviewerId: string,
  ): Promise<ApplicationDocument> {
    const application = await this.findOne(id);

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application has already been reviewed');
    }

    const previousStatus = application.status;

    // Update application status
    application.status = reviewDto.status;
    application.reviewedAt = new Date();
    application.reviewedBy = reviewerId;

    if (reviewDto.status === ApplicationStatus.REJECTED) {
      application.rejectionReason = reviewDto.rejectionReason;
    }

    await application.save();

    // Log application review activity
    try {
      const activityType = reviewDto.status === ApplicationStatus.APPROVED 
        ? ActivityType.APPROVAL 
        : ActivityType.REJECTION;
      
      await this.adminService.logActivity({
        activityType,
        title: `Application ${reviewDto.status === ApplicationStatus.APPROVED ? 'Approved' : 'Rejected'}`,
        description: `${application.role} application for ${application.email} was ${reviewDto.status.toLowerCase()} by reviewer`,
        userId: reviewerId,
        metadata: {
          applicationId: (application as any)._id.toString(),
          applicantEmail: application.email,
          applicantRole: application.role,
          previousStatus,
          newStatus: reviewDto.status,
          rejectionReason: reviewDto.rejectionReason,
          reviewedAt: new Date().toISOString(),
        },
      });

      // Also log as APPLICATION_REVIEWED for general tracking
      await this.adminService.logActivity({
        activityType: ActivityType.APPLICATION_REVIEWED,
        title: `Application Reviewed - ${reviewDto.status}`,
        description: `Application review completed for ${application.email}`,
        userId: reviewerId,
        metadata: {
          applicationId: (application as any)._id.toString(),
          applicantEmail: application.email,
          applicantRole: application.role,
          decision: reviewDto.status,
          reviewedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log application review activity:', error);
    }

    // If approved, create user and related entity
    if (reviewDto.status === ApplicationStatus.APPROVED) {
      await this.processApprovedApplication(application);
    }

    return application;
  }
  private async processApprovedApplication(
    application: ApplicationDocument,
  ): Promise<void> {
    const session = await this.applicationModel.db.startSession();
    session.startTransaction();

    try {
      // Create user
      const user = await this.usersService.create(
        {
          email: application.email,
          password: application.password, // Already hashed
          role: this.mapApplicationRoleToUserRole(application.role),
          name: application.profileData.name,
          phoneNumber:
            application.profileData.contactNumber ||
            application.profileData.phoneNumber,
        },
        { session },
      );

      application.createdUserId = (user as any)._id.toString();

      // Create related entity based on role
      if (application.role === ApplicationRole.BLOOD_BANK) {
        const bloodBank = await this.bloodBankService.create(
          application.profileData as any,
          { session },
        );
        application.createdEntityId = (bloodBank as any)._id.toString();

        // Log blood bank registration
        try {
          await this.adminService.logActivity({
            activityType: ActivityType.BLOOD_BANK_REGISTERED,
            title: 'Blood Bank Registered via Application',
            description: `Blood bank ${application.profileData.name} registered through approved application`,
            userId: application.createdUserId,
            metadata: {
              applicationId: (application as any)._id.toString(),
              bloodBankId: application.createdEntityId,
              bloodBankName: application.profileData.name,
              email: application.email,
              registeredAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error('Failed to log blood bank registration activity:', error);
        }
      } else if (application.role === ApplicationRole.MEDICAL_INSTITUTION) {
        const medicalInstitution = await this.medicalInstitutionService.create(
          {
            ...application.profileData,
            user: (user as any)._id.toString(),
          } as any,
          { session },
        );
        application.createdEntityId = (
          medicalInstitution as any
        )._id.toString();

        // Log medical institution registration
        try {
          await this.adminService.logActivity({
            activityType: ActivityType.MEDICAL_INSTITUTION_REGISTERED,
            title: 'Medical Institution Registered via Application',
            description: `Medical institution ${application.profileData.name} registered through approved application`,
            userId: application.createdUserId,
            metadata: {
              applicationId: (application as any)._id.toString(),
              medicalInstitutionId: application.createdEntityId,
              institutionName: application.profileData.name,
              email: application.email,
              registeredAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error('Failed to log medical institution registration activity:', error);
        }
      }

      await application.save({ session });

      // Commit the transaction
      await session.commitTransaction();
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();

      // If entity creation fails, revert application status
      application.status = ApplicationStatus.PENDING;
      application.reviewedAt = undefined;
      application.reviewedBy = undefined;
      await application.save();
      throw new BadRequestException(
        `Failed to create user/entity for approved application: ${error.message}`,
      );
    } finally {
      // End the session
      session.endSession();
    }
  }

  private mapApplicationRoleToUserRole(appRole: ApplicationRole): UserRole {
    switch (appRole) {
      case ApplicationRole.BLOOD_BANK:
        return UserRole.BLOOD_BANK;
      case ApplicationRole.MEDICAL_INSTITUTION:
        return UserRole.MEDICAL_INSTITUTION;
      default:
        throw new BadRequestException(`Invalid application role: ${appRole}`);
    }
  }

  async remove(id: string): Promise<void> {
    const application = await this.findOne(id);

    if (application.status === ApplicationStatus.APPROVED) {
      throw new BadRequestException('Cannot delete approved applications');
    }

    await this.applicationModel.findByIdAndDelete(id);

    // Log application deletion activity
    try {
      await this.adminService.logActivity({
        activityType: ActivityType.REJECTION, // Using REJECTION as it's closest to deletion
        title: 'Application Deleted',
        description: `${application.role} application for ${application.email} was deleted`,
        metadata: {
          applicationId: (application as any)._id.toString(),
          applicantEmail: application.email,
          applicantRole: application.role,
          previousStatus: application.status,
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log application deletion activity:', error);
    }
  }

  async getStatistics() {
    const total = await this.applicationModel.countDocuments();
    const pending = await this.applicationModel.countDocuments({
      status: ApplicationStatus.PENDING,
    });
    const approved = await this.applicationModel.countDocuments({
      status: ApplicationStatus.APPROVED,
    });
    const rejected = await this.applicationModel.countDocuments({
      status: ApplicationStatus.REJECTED,
    });

    const bloodBankApplications = await this.applicationModel.countDocuments({
      role: ApplicationRole.BLOOD_BANK,
    });
    const medicalInstitutionApplications =
      await this.applicationModel.countDocuments({
        role: ApplicationRole.MEDICAL_INSTITUTION,
      });

    return {
      total,
      pending,
      approved,
      rejected,
      byRole: {
        bloodBank: bloodBankApplications,
        medicalInstitution: medicalInstitutionApplications,
      },
    };
  }
}
