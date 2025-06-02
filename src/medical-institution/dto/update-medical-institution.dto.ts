import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicalInstitutionDto } from './create-medical-institution.dto';

export class UpdateMedicalInstitutionDto extends PartialType(
  CreateMedicalInstitutionDto,
) {}
