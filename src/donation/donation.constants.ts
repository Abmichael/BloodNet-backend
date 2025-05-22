export enum DonationStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  DEFERRED = 'deferred',
  PENDING = 'pending',
  FAILED = 'failed',
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
