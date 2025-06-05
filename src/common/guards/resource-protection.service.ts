import { Injectable } from '@nestjs/common';
import { UserRole, User, UserDocument } from '../../users/schemas/user.schema';
import { ApiException } from '../filters/exception';
import { Types } from 'mongoose';

@Injectable()
export class ResourceProtectionService {
  /**
   * Determines the resource type from an entity ID by checking collection patterns
   */
  private determineResourceType(
    entityId: string,
  ): 'donor' | 'bloodBank' | 'institution' | 'unknown' {
    // This is a simplified approach - in practice, you might want to check the database
    // or use a more sophisticated method to determine the resource type
    // For now, we'll rely on the context provided by the caller
    return 'unknown';
  }

  /**
   * Checks if a user has access to a specific resource based on their associations
   */
  hasResourceAssociation(
    user: Partial<User>,
    resourceId: string,
    resourceType: 'donor' | 'bloodBank' | 'institution',
  ): boolean {
    if (!user || !resourceId) return false;

    switch (resourceType) {
      case 'donor':
        return user.donorId?.toString() === resourceId;
      case 'bloodBank':
        return user.bloodBankId?.toString() === resourceId;
      case 'institution':
        return user.institutionId?.toString() === resourceId;
      default:
        return false;
    }
  }
  /**
   * Enhanced access control that uses user resource associations
   */
  canAccessResource(
    user: Partial<User>,
    resourceId: string,
    resourceType: 'donor' | 'bloodBank' | 'institution',
    allowedRoles: UserRole[] = [UserRole.ADMIN],
  ): boolean {
    // Admin role has access to everything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check if user's role is in the allowed roles
    if (user.role && allowedRoles.includes(user.role)) {
      return true;
    }

    // Check resource-specific associations
    return this.hasResourceAssociation(user, resourceId, resourceType);
  }

  /**
   * Checks if a user can access a donation based on their associations
   */
  canAccessDonation(
    user: Partial<User>,
    donorId?: string,
    bloodBankId?: string,
    institutionId?: string,
  ): boolean {
    // Admin has access to everything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check based on user role and associations
    switch (user.role) {
      case UserRole.DONOR:
        // Donors can only access their own donations
        return donorId
          ? this.hasResourceAssociation(user, donorId, 'donor')
          : false;

      case UserRole.BLOOD_BANK:
        // Blood banks can access donations from their facilities
        return bloodBankId
          ? this.hasResourceAssociation(user, bloodBankId, 'bloodBank')
          : false;

      case UserRole.MEDICAL_INSTITUTION:
        // Medical institutions can access donations they're associated with
        // This could be through blood bank partnerships or direct associations
        return (
          (institutionId
            ? this.hasResourceAssociation(user, institutionId, 'institution')
            : false) ||
          (bloodBankId
            ? this.hasResourceAssociation(user, bloodBankId, 'bloodBank')
            : false)
        );

      default:
        return false;
    }
  }

  /**
   * Checks if a user can access a blood request based on their associations
   */
  canAccessBloodRequest(
    user: Partial<User>,
    requestingInstitutionId?: string,
    bloodBankId?: string,
  ): boolean {
    // Admin has access to everything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check based on user role and associations
    switch (user.role) {
      case UserRole.MEDICAL_INSTITUTION:
        // Medical institutions can access requests they made
        return requestingInstitutionId
          ? this.hasResourceAssociation(
              user,
              requestingInstitutionId,
              'institution',
            )
          : false;

      case UserRole.BLOOD_BANK:
        // Blood banks can access requests directed to them
        return bloodBankId
          ? this.hasResourceAssociation(user, bloodBankId, 'bloodBank')
          : false;

      case UserRole.DONOR:
        // Donors typically cannot access blood requests directly
        return false;

      default:
        return false;
    }
  }

  /**
   * Checks if a user has access to a resource based on ownership and role
   *
   * @param userId The ID of the current user
   * @param userRole The role of the current user
   * @param resourceOwnerId The ID of the resource owner (null if resource not owned by any user)
   * @param allowedRoles Array of roles that can access the resource regardless of ownership
   * @returns boolean indicating whether access is allowed
   */
  canAccess(
    userId: string,
    userRole: UserRole,
    resourceOwnerId?: string | null,
    allowedRoles: UserRole[] = [UserRole.ADMIN],
  ): boolean {
    // Admin role has access to everything
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Check if user's role is in the allowed roles
    if (allowedRoles.includes(userRole)) {
      return true;
    }

    // Check if user owns the resource
    if (resourceOwnerId && userId === resourceOwnerId.toString()) {
      return true;
    }

    return false;
  }
  /**
   * Verifies user access to a resource and throws exception if access is not allowed
   *
   * @param userId The ID of the current user
   * @param userRole The role of the current user
   * @param resourceOwnerId The ID of the resource owner
   * @param resourceType The type of resource being accessed (for error messaging)
   * @param allowedRoles Array of roles that can access the resource regardless of ownership
   */
  verifyAccess(
    userId: string,
    userRole: UserRole,
    resourceOwnerId: string | null,
    resourceType: string,
    allowedRoles: UserRole[] = [UserRole.ADMIN],
  ): void {
    if (!this.canAccess(userId, userRole, resourceOwnerId, allowedRoles)) {
      throw new ApiException([
        {
          field: 'id',
          message: `You do not have permission to access this ${resourceType}`,
        },
      ]);
    }
  }

  /**
   * Enhanced verify access using user resource associations
   */
  verifyResourceAccess(
    user: Partial<User>,
    resourceId: string,
    resourceType: 'donor' | 'bloodBank' | 'institution',
    resourceName: string,
    allowedRoles: UserRole[] = [UserRole.ADMIN],
  ): void {
    if (!this.canAccessResource(user, resourceId, resourceType, allowedRoles)) {
      throw new ApiException([
        {
          field: 'id',
          message: `You do not have permission to access this ${resourceName}`,
        },
      ]);
    }
  }

  /**
   * Verifies user can access a donation and throws exception if not allowed
   */
  verifyDonationAccess(
    user: Partial<User>,
    donorId?: string,
    bloodBankId?: string,
    institutionId?: string,
  ): void {
    if (!this.canAccessDonation(user, donorId, bloodBankId, institutionId)) {
      throw new ApiException([
        {
          field: 'donation',
          message: 'You do not have permission to access this donation',
        },
      ]);
    }
  }

  /**
   * Verifies user can access a blood request and throws exception if not allowed
   */
  verifyBloodRequestAccess(
    user: Partial<User>,
    requestingInstitutionId?: string,
    bloodBankId?: string,
  ): void {
    if (
      !this.canAccessBloodRequest(user, requestingInstitutionId, bloodBankId)
    ) {
      throw new ApiException([
        {
          field: 'bloodRequest',
          message: 'You do not have permission to access this blood request',
        },
      ]);
    }
  }  /**
   * Builds a filter criteria to only return resources a user has access to
   *
   * @param user The user object containing role and associated resource IDs
   * @param ownerField The database field that represents the resource owner
   * @returns Object containing filter criteria
   */
  buildAccessFilter(
    user: Partial<UserDocument>,
    ownerField: string = 'donor',
  ): any {
    // Admin has access to all resources
    if (user.role === UserRole.ADMIN) {
      return {};
    }

    // For MEDICAL_INSTITUTION, filter based on role and assignment
    if (user.role === UserRole.MEDICAL_INSTITUTION) {
      const filters: any[] = [];
      
      // Add filter for resources owned by this institution
      if (user.institutionId) {
        filters.push({ [ownerField]: user.institutionId });
        filters.push({ institution: user.institutionId });
        filters.push({ requestingInstitution: user.institutionId });
        filters.push({ dispatchedTo: user.institutionId });
      }
      
      // Add filter for resources from associated blood banks
      if (user.bloodBankId) {
        filters.push({ bloodBank: user.bloodBankId });
      }

      return filters.length > 0 ? { $or: filters } : { _id: { $exists: false } };
    }

    if (user.role === UserRole.BLOOD_BANK) {
      const filters: any[] = [];
      
      // Add filter for resources owned by this blood bank
      if (user.bloodBankId) {
        filters.push({ [ownerField]: user.bloodBankId });
        filters.push({ bloodBank: user.bloodBankId });
        filters.push({ targetBloodBank: user.bloodBankId });
      }

      return filters.length > 0 ? { $or: filters } : { _id: { $exists: false } };
    }

    // For DONOR role, only show their own resources
    if (user.role === UserRole.DONOR) {
      if (user.donorId) {
        return { [ownerField]: user.donorId };
      }
      return { _id: { $exists: false } };
    }

    // Default: return no resources
    return { _id: { $exists: false } };
  }

  /**
   * Enhanced filter that uses user resource associations
   */
  buildResourceFilter(
    user: Partial<User>,
    resourceType: 'donation' | 'bloodRequest' | 'general' = 'general',
  ): any {
    // Admin has access to all resources
    if (user.role === UserRole.ADMIN) {
      return {};
    }

    if (!user.role) {
      return { _id: { $exists: false } };
    }

    switch (resourceType) {
      case 'donation':
        return this.buildDonationFilter(user);
      case 'bloodRequest':
        return this.buildBloodRequestFilter(user);
      default:
        return this.buildGeneralFilter(user);
    }
  }

  /**
   * Builds filter for donation queries based on user associations
   */
  private buildDonationFilter(user: Partial<User>): any {
    switch (user.role) {
      case UserRole.DONOR:
        // Donors can only see their own donations
        if (user.donorId) {
          return { donor: user.donorId };
        }
        return { _id: { $exists: false } };

      case UserRole.BLOOD_BANK:
        // Blood banks can see donations from their facilities
        if (user.bloodBankId) {
          return { bloodBank: user.bloodBankId };
        }
        return { _id: { $exists: false } };

      case UserRole.MEDICAL_INSTITUTION:
        // Medical institutions can see donations they have access to
        const filters: any[] = [];

        if (user.institutionId) {
          // Donations dispatched to this institution
          filters.push({ dispatchedTo: user.institutionId });
          // Donations reserved for requests from this institution
          filters.push({
            'reservedForRequest.requestingInstitution': user.institutionId,
          });
        }

        if (user.bloodBankId) {
          // Donations from blood banks they're associated with
          filters.push({ bloodBank: user.bloodBankId });
        }

        return filters.length > 0
          ? { $or: filters }
          : { _id: { $exists: false } };

      default:
        return { _id: { $exists: false } };
    }
  }

  /**
   * Builds filter for blood request queries based on user associations
   */
  private buildBloodRequestFilter(user: Partial<User>): any {
    switch (user.role) {
      case UserRole.MEDICAL_INSTITUTION:
        // Medical institutions can see requests they made
        if (user.institutionId) {
          return { requestingInstitution: user.institutionId };
        }
        return { _id: { $exists: false } };

      case UserRole.BLOOD_BANK:
        // Blood banks can see requests directed to them
        if (user.bloodBankId) {
          return { targetBloodBank: user.bloodBankId };
        }
        return { _id: { $exists: false } };

      case UserRole.DONOR:
        // Donors typically cannot see blood requests
        return { _id: { $exists: false } };

      default:
        return { _id: { $exists: false } };
    }
  }

  /**
   * Builds general filter for resources based on user associations
   */
  private buildGeneralFilter(user: Partial<User>): any {
    const filters: any[] = [];

    switch (user.role) {
      case UserRole.DONOR:
        if (user.donorId) {
          filters.push({ donor: user.donorId });
        }
        break;

      case UserRole.BLOOD_BANK:
        if (user.bloodBankId) {
          filters.push({ bloodBank: user.bloodBankId });
        }
        break;

      case UserRole.MEDICAL_INSTITUTION:
        if (user.institutionId) {
          filters.push({ institution: user.institutionId });
          filters.push({ requestingInstitution: user.institutionId });
        }
        if (user.bloodBankId) {
          filters.push({ bloodBank: user.bloodBankId });
        }
        break;
    }

    return filters.length > 0 ? { $or: filters } : { _id: { $exists: false } };
  }

  /**
   * Check if a user has any resource associations
   */
  hasAnyResourceAssociation(user: Partial<User>): boolean {
    return !!(user.donorId || user.bloodBankId || user.institutionId);
  }
}
