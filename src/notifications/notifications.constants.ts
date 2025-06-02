// Notification message templates
export const NOTIFICATION_MESSAGES = {
  BLOOD_REQUEST: {
    NEW: {
      TITLE: (bloodType: string) => `New Blood Request - ${bloodType}`,
      MESSAGE: (bloodType: string, location: string) =>
        `Blood type ${bloodType} is needed at ${location}. Your donation could save lives!`,
    },
    URGENT: {
      TITLE: (bloodType: string) => `🚨 Urgent Blood Request - ${bloodType}`,
      MESSAGE: (bloodType: string, location: string) =>
        `Blood type ${bloodType} is needed urgently at ${location}. Your donation could save lives!`,
    },
    FULFILLED: {
      TITLE: 'Blood Request Fulfilled',
      MESSAGE: (bloodType: string, fulfilledBy: string) =>
        `Your blood request for ${bloodType} has been fulfilled by ${fulfilledBy}.`,
    },
  },
  DONATION: {
    RESULT_READY: {
      TITLE: '🩸 Your Donation Results Are Ready',
      MESSAGE: (donationDate: string, bloodBankName: string) =>
        `Your test results from your donation on ${donationDate} are ready. Please visit ${bloodBankName} to collect your results.`,
    },
    APPOINTMENT_REMINDER: {
      TITLE: '📅 Donation Appointment Reminder',
      MESSAGE: (appointmentTime: string, bloodBankName: string) =>
        `Don't forget your blood donation appointment tomorrow at ${appointmentTime} at ${bloodBankName}.`,
    },
  },
} as const;

// Notification delivery settings
export const NOTIFICATION_SETTINGS = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MINUTES: 30,
  CLEANUP_AFTER_DAYS: 30,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// Notification priorities for urgent requests
export const URGENT_PRIORITIES = ['critical', 'high'] as const;

// Time settings
export const TIME_SETTINGS = {
  DONATION_RESULT_READY_HOURS: 48, // Results ready after 48 hours
  APPOINTMENT_REMINDER_HOURS: 24, // Remind 24 hours before appointment
} as const;
