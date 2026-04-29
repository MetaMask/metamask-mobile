import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';

const googleLoginChangePasswordFlowEventNames = [
  onboardingEvents.PASSWORD_CHANGED,
];

export const googleLoginChangePasswordAnalyticsExpectations: AnalyticsExpectations =
  {
    eventNames: googleLoginChangePasswordFlowEventNames,
    events: [
      {
        name: onboardingEvents.PASSWORD_CHANGED,
        containProperties: {
          biometrics_enabled: false,
        },
      },
    ],
  };
