export enum DonationStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  DEFERRED = 'deferred',
  PENDING = 'pending',
  FAILED = 'failed',
}

// New enum to track blood unit status after donation completion
export enum BloodUnitStatus {
  IN_INVENTORY = 'in_inventory',
  RESERVED = 'reserved', // Reserved for a specific request
  DISPATCHED = 'dispatched', // Sent to hospital/patient
  USED = 'used', // Transfused to patient
  EXPIRED = 'expired', // Expired due to shelf life
  DISCARDED = 'discarded', // Discarded due to quality issues
  QUARANTINED = 'quarantined', // Under investigation/testing
}

export enum DonationType {
  WHOLE_BLOOD = 'whole_blood',
  PLATELETS = 'platelets',
  PLASMA = 'plasma',
  RED_CELLS = 'red_cells',
  WHITE_CELLS = 'white_cells',
  STEM_CELLS = 'stem_cells',
  BONE_MARROW = 'bone_marrow',
  CORD_BLOOD = 'cord_blood',
  OTHER = 'other',
}

export enum DonationPurpose {
  THERAPEUTIC = 'therapeutic',
  RESEARCH = 'research',
  TRANSFUSION = 'transfusion',
  OTHER = 'other',
}

export enum CollectionMethod {
  PHLEBOTOMY = 'phlebotomy',
  APHERESIS = 'apheresis ',
  OTHER = 'other',
}
