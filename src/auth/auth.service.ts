import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { DonorService } from '../donor/donor.service';
import { BloodBankService } from '../blood-bank/blood-bank.service';
import { MedicalInstitutionService } from '../medical-institution/medical-institution.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UserDocument, UserRole } from 'src/users/schemas/user.schema';
import {
  ApiException,
  AuthenticationException,
  AuthorizationException,
  ValidationException,
} from 'src/common/filters/exception';
import mongoose from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private donorService: DonorService,
    private bloodBankService: BloodBankService,
    private medicalInstitutionService: MedicalInstitutionService,
    private jwtService: JwtService,
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

    if (!isSelfRegistration && ['hospital', 'blood-bank'].includes(dto.role)) {
      if (currentUser.role !== 'admin') {
        throw new AuthorizationException([
          {
            message: 'Only admins can create hospital/blood-bank users',
            field: 'role',
            value: dto.role,
          },
        ]);
      }
    }

    if (isSelfRegistration && dto.role !== 'donor') {
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
