import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';

/**
 * Events fired during a Google new-user social login onboarding flow.
 */
const googleLoginNewUserFlowEventNames = [
  onboardingEvents.METRICS_OPT_IN,
  onboardingEvents.SOCIAL_LOGIN_COMPLETED,
  onboardingEvents.WALLET_CREATION_ATTEMPTED,
  onboardingEvents.WALLET_CREATED,
  onboardingEvents.WALLET_SETUP_COMPLETED,
];

/**
 * Expected MetaMetrics payloads after completing Google social login onboarding.
 * Social login always enables metrics programmatically, so all events are always tracked.
 */
export const googleLoginNewUserAnalyticsExpectations: AnalyticsExpectations = {
  eventNames: googleLoginNewUserFlowEventNames,
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
      name: onboardingEvents.SOCIAL_LOGIN_COMPLETED,
      containProperties: {
        account_type: 'metamask_google',
      },
    },
    {
      name: onboardingEvents.WALLET_CREATION_ATTEMPTED,
      containProperties: {
        account_type: 'metamask_google',
      },
    },
    {
      name: onboardingEvents.WALLET_CREATED,
      containProperties: {
        biometrics_enabled: false,
        account_type: 'metamask_google',
      },
    },
    {
      name: onboardingEvents.WALLET_SETUP_COMPLETED,
      containProperties: {
        wallet_setup_type: 'new',
        new_wallet: true,
        account_type: 'metamask_google',
      },
    },
  ],
};
