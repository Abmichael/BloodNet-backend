import { PartialType } from '@nestjs/mapped-types';
import { CreateBloodBagDto } from './create-blood-bag.dto';

export class UpdateBloodBagDto extends PartialType(CreateBloodBagDto) {}
