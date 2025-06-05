import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SearchUsersDto } from './dto/search-users.dto';
import { UserSearchResponseDto } from './dto/user-search-response.dto';
import { UserRole } from './schemas/user.schema';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('search')
  @Roles(UserRole.ADMIN) // Only admins can search users
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    try {
      const { q: query, limit = 10, page = 1 } = searchDto;

      if (!query || query.trim().length < 2) {
        throw new HttpException(
          'Search query must be at least 2 characters long',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.userService.searchUsers(query, {
        limit: Math.min(Number(limit), 50), // Cap at 50 results
        page: Number(page),
      });

      return {
        users: result.users,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal server error while searching users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
