import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';

const appleLoginNewUserFlowEventNames = [
  onboardingEvents.METRICS_OPT_IN,
  onboardingEvents.WALLET_SETUP_STARTED,
  onboardingEvents.SOCIAL_LOGIN_COMPLETED,
  onboardingEvents.WALLET_CREATION_ATTEMPTED,
  onboardingEvents.WALLET_CREATED,
  onboardingEvents.WALLET_SETUP_COMPLETED,
  onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
];

export const appleLoginNewUserAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: appleLoginNewUserFlowEventNames,
  events: [
    {
      name: onboardingEvents.METRICS_OPT_IN,
      containProperties: {
        updated_after_onboarding: false,
        location: 'onboarding_social_login',
        account_type: 'metamask_apple',
      },
    },
    {
      name: onboardingEvents.WALLET_SETUP_STARTED,
      containProperties: {
        account_type: 'metamask_apple',
      },
    },
    {
      name: onboardingEvents.SOCIAL_LOGIN_COMPLETED,
      containProperties: {
        account_type: 'metamask_apple',
      },
    },
    {
      name: onboardingEvents.WALLET_CREATION_ATTEMPTED,
      containProperties: {
        account_type: 'metamask_apple',
      },
    },
    {
      name: onboardingEvents.WALLET_CREATED,
      containProperties: {
        biometrics_enabled: false,
        account_type: 'metamask_apple',
      },
    },
    {
      name: onboardingEvents.WALLET_SETUP_COMPLETED,
      containProperties: {
        wallet_setup_type: 'new',
        new_wallet: true,
        account_type: 'metamask_apple',
      },
    },
    {
      name: onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
      containProperties: {
        is_metrics_opted_in: true,
        location: 'onboarding_choosePassword',
        updated_after_onboarding: false,
        account_type: 'metamask_apple',
      },
    },
  ],
};
