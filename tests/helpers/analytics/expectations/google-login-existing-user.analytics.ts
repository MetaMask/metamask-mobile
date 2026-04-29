import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';

const googleLoginExistingUserFlowEventNames = [
  onboardingEvents.METRICS_OPT_IN,
  onboardingEvents.WALLET_SETUP_STARTED,
  onboardingEvents.SOCIAL_LOGIN_COMPLETED,
  onboardingEvents.ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED,
];

export const googleLoginExistingUserAnalyticsExpectations: AnalyticsExpectations =
  {
    eventNames: googleLoginExistingUserFlowEventNames,
    events: [
      {
        name: onboardingEvents.METRICS_OPT_IN,
        containProperties: {
          updated_after_onboarding: false,
          location: 'onboarding_social_login',
          account_type: 'metamask_google',
        },
      },
      {
        name: onboardingEvents.WALLET_SETUP_STARTED,
        containProperties: {
          account_type: 'metamask_google',
        },
      },
      {
        name: onboardingEvents.SOCIAL_LOGIN_COMPLETED,
        containProperties: {
          account_type: 'imported_google',
        },
      },
      {
        name: onboardingEvents.ACCOUNT_ALREADY_EXISTS_PAGE_VIEWED,
      },
    ],
  };
