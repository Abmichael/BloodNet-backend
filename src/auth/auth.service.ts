import {
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UserDocument } from 'src/users/schemas/user.schema';
import { 
  ApiException, 
  AuthenticationException, 
  AuthorizationException, 
  ValidationException 
} from 'src/common/filters/exception';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new AuthenticationException([{
        message: 'Invalid email or password'
      }]);
    }
    
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationException([{
        message: 'Invalid email or password'
      }]);
    }
    
    const { password, ...result } = user.toObject();
    return result;
  }

  async login(user: any) {
    const payload = { sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  async register(
    dto: RegisterDto,
    currentUser?: UserDocument,
  ): Promise<{ token?: string; user?: UserDocument }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ValidationException([{ 
      field: 'email',
      message: 'Email already registered',
      value: dto.email
    }]);

    const isSelfRegistration = !currentUser;

    if (!isSelfRegistration && ['hospital', 'blood-bank'].includes(dto.role)) {
      if (currentUser.role !== 'admin') {
        throw new AuthorizationException([{
          message: 'Only admins can create hospital/blood-bank users',
          field: 'role',
          value: dto.role
        }]);
      }
    }

    if (isSelfRegistration && dto.role !== 'donor') {
      throw new ValidationException([{
        field: 'role',
        message: 'Self-registration is allowed only for donors',
        value: dto.role
      }]);
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      password: hashed,
      role: dto.role,
    });

    if (isSelfRegistration) {
      const token = this.jwtService.sign({ sub: user._id, role: user.role });
      return { token };
    }

    return { user };
  }
}
