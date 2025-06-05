// Response DTO for user search
// File: src/users/dto/user-search-response.dto.ts

import { UserRole } from "../schemas/user.schema";

export class UserDto {
  _id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export class UserSearchResponseDto {
  users: UserDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
