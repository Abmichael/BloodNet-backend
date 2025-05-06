import { PartialType } from '@nestjs/mapped-types';
import { CreateBloodBankDto } from './create-blood-bank.dto';

export class UpdateBloodBankDto extends PartialType(CreateBloodBankDto) {}
