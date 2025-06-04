import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { DonorService } from '../donor/donor.service';
import { BloodBankService } from '../blood-bank/blood-bank.service';
import { MedicalInstitutionService } from '../medical-institution/medical-institution.service';
import { RegisterDto } from './dto/register.dto';
import {
  ValidationException,
  AuthenticationException,
  AuthorizationException,
} from '../common/filters/exception';
import { UserRole } from '../users/schemas/user.schema';
import { UserDocument } from '../users/schemas/user.schema';
import * as mongoose from 'mongoose';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/entities/activity-log.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private donorService: DonorService,
    private bloodBankService: BloodBankService,
    private medicalInstitutionService: MedicalInstitutionService,
    private jwtService: JwtService,
    private adminService: AdminService,
  ) {}
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new AuthenticationException([
        {
          message: 'Invalid email or password',
        },
      ]);
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationException([
        {
          message: 'Invalid email or password',
        },
      ]);
    }

    const { password, ...result } = user.toObject();
    return result;
  }

  async login(user: any) {
    const payload = { sub: user._id, role: user.role };
    // Remove password if present
    const { password, ...userWithoutPassword } = user.toObject
      ? user.toObject()
      : user;

    // Log user login activity only for admin users
    if (user.role === UserRole.ADMIN) {
      try {
        await this.adminService.logActivity({
          activityType: ActivityType.USER_LOGIN,
          title: 'User Login',
          description: `Admin user ${user.email} logged in successfully`,
          userId: (user as any)._id.toString(),
          metadata: {
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to log login activity:', error);
      }
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }

  async register(
    dto: RegisterDto,
    currentUser?: UserDocument,
  ): Promise<{ token?: string; user?: UserDocument }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing)
      throw new ValidationException([
        {
          field: 'email',
          message: 'Email already registered',
          value: dto.email,
        },
      ]);

    const isSelfRegistration = !currentUser;

    if (
      !isSelfRegistration &&
      [UserRole.MEDICAL_INSTITUTION, UserRole.BLOOD_BANK].includes(
        dto.role as UserRole,
      )
    ) {
      if (currentUser.role !== UserRole.ADMIN) {
        throw new AuthorizationException([
          {
            message: 'Only admins can create hospital/blood-bank users',
            field: 'role',
            value: dto.role,
          },
        ]);
      }
    }

    if (isSelfRegistration && dto.role !== UserRole.DONOR) {
      throw new ValidationException([
        {
          field: 'role',
          message: 'Self-registration is allowed only for donors',
          value: dto.role,
        },
      ]);
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      ...dto,
      password: hashed,
    });

    // Log registration activity
    try {
      let activityType = ActivityType.REGISTRATION;
      let activityTitle = 'User Registration';

      // Use specific activity types for different roles
      if (dto.role === UserRole.DONOR) {
        activityType = ActivityType.DONOR_REGISTERED;
        activityTitle = 'Donor Registration';
      } else if (dto.role === UserRole.BLOOD_BANK) {
        activityType = ActivityType.BLOOD_BANK_REGISTERED;
        activityTitle = 'Blood Bank Registration';
      } else if (dto.role === UserRole.MEDICAL_INSTITUTION) {
        activityType = ActivityType.MEDICAL_INSTITUTION_REGISTERED;
        activityTitle = 'Medical Institution Registration';
      }

      await this.adminService.logActivity({
        activityType,
        title: activityTitle,
        description: `New ${dto.role} registered: ${dto.email}`,
        userId: user._id as string,
        metadata: {
          email: dto.email,
          name: dto.name,
          role: dto.role,
          selfRegistration: isSelfRegistration,
          registeredBy: currentUser
            ? (currentUser as any)._id.toString()
            : null,
          registrationTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log registration activity:', error);
    }

    if (isSelfRegistration) {
      const token = this.jwtService.sign({ sub: user._id, role: user.role });
      return { token };
    }

    return { user };
  }

  async checkToken(user: any) {
    const { password, ...userWithoutPassword } = user.toObject
      ? user.toObject()
      : user;
    return {
      user: userWithoutPassword,
    };
  }

  async getProfileStatus(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new AuthenticationException([
        {
          message: 'User not found',
        },
      ]);
    }

    let hasProfile = false;
    let profileData: any = null;

    switch (user.role) {
      case UserRole.DONOR:
        profileData = await this.donorService.findByUser(
          new mongoose.Types.ObjectId(userId),
        );
        hasProfile = !!profileData;
        break;

      case UserRole.BLOOD_BANK:
        profileData = await this.bloodBankService.findByUser(
          new mongoose.Types.ObjectId(userId),
        );
        hasProfile = !!profileData;
        break;

      case UserRole.MEDICAL_INSTITUTION:
        profileData = await this.medicalInstitutionService.findByUser(
          new mongoose.Types.ObjectId(userId),
        );
        hasProfile = !!profileData;
        break;

      case UserRole.ADMIN:
        // Admins don't need role-specific profiles
        hasProfile = true;
        break;

      default:
        hasProfile = false;
    }

    // Update user's profileComplete status if it's different
    if (user.profileComplete !== hasProfile) {
      await this.usersService.updateProfileStatus(userId, hasProfile);
    }

    return {
      profileComplete: hasProfile,
      role: user.role,
      hasProfile,
      profileData: profileData
        ? profileData.toObject
          ? profileData.toObject()
          : profileData
        : null,
    };
  }
}
