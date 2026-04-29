import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';

const googleLoginResetWalletFlowEventNames = [
  onboardingEvents.FORGOT_PASSWORD_CLICKED,
  onboardingEvents.RESET_WALLET,
  onboardingEvents.RESET_WALLET_CONFIRMED,
];

export const googleLoginResetWalletAnalyticsExpectations: AnalyticsExpectations =
  {
    eventNames: googleLoginResetWalletFlowEventNames,
    events: [
      {
        name: onboardingEvents.FORGOT_PASSWORD_CLICKED,
      },
      {
        name: onboardingEvents.RESET_WALLET,
        requiredDefinedPropertyKeys: ['account_type'],
      },
      {
        name: onboardingEvents.RESET_WALLET_CONFIRMED,
      },
    ],
  };
