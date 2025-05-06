import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from 'src/users/schemas/user.schema';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsEnum(UserRole)
  role: UserRole;
}
