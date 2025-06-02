import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserDocument } from 'src/users/schemas/user.schema';
import { AuthenticationException } from 'src/common/filters/exception';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Public()
  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    try {
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );
      return this.authService.login(user);
    } catch (error) {
      // Re-throw authentication errors
      throw error;
    }
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Roles('admin')
  @Post('admin/register')
  async adminRegister(
    @Body() dto: RegisterDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.authService.register(dto, user);
  }
  @UseGuards(JwtAuthGuard)
  @Post('check-token')
  async checkToken(@CurrentUser() user: UserDocument) {
    return this.authService.checkToken(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile-status')
  async getProfileStatus(@CurrentUser() user: UserDocument) {
    return this.authService.getProfileStatus(String(user._id));
  }
}
