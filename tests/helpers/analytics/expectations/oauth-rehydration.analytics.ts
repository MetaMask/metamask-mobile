import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';

const googleOAuthRehydrationSuccessEventNames = [
  onboardingEvents.REHYDRATION_PASSWORD_ATTEMPTED,
  onboardingEvents.REHYDRATION_COMPLETED,
];

export const googleOAuthRehydrationSuccessAnalyticsExpectations: AnalyticsExpectations =
  {
    eventNames: googleOAuthRehydrationSuccessEventNames,
    events: [
      {
        name: onboardingEvents.REHYDRATION_PASSWORD_ATTEMPTED,
        containProperties: {
          account_type: 'imported_google',
          biometrics: true,
        },
      },
      {
        name: onboardingEvents.REHYDRATION_COMPLETED,
        containProperties: {
          account_type: 'imported_google',
          biometrics: true,
          failed_attempts: 0,
        },
      },
    ],
  };
