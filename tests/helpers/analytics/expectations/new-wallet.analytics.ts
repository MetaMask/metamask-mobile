import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';

/**
 * Expected MetaMetrics payloads after creating a new wallet with metrics opt-in.
 */
export const newWalletWithMetricsOptInExpectations: AnalyticsExpectations = {
  eventNames: [
    onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
    onboardingEvents.WALLET_SETUP_STARTED,
    onboardingEvents.WALLET_CREATION_ATTEMPTED,
    onboardingEvents.WALLET_CREATED,
    onboardingEvents.WALLET_SETUP_COMPLETED,
  ],
  events: [
    {
      name: onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
      matchProperties: {
        has_marketing_consent: false,
        is_metrics_opted_in: true,
        location: 'onboarding_metametrics',
        updated_after_onboarding: false,
        account_type: 'metamask',
      },
    },
    {
      name: onboardingEvents.WALLET_SETUP_STARTED,
      matchProperties: {
        account_type: 'metamask',
      },
    },
    {
      name: onboardingEvents.WALLET_CREATION_ATTEMPTED,
      matchProperties: {
        account_type: 'metamask',
      },
    },
    {
      name: onboardingEvents.WALLET_CREATED,
      matchProperties: {
        biometrics_enabled: false,
        account_type: 'metamask',
      },
    },
    {
      name: onboardingEvents.WALLET_SETUP_COMPLETED,
      matchProperties: {
        wallet_setup_type: 'new',
        new_wallet: true,
        account_type: 'metamask',
      },
    },
  ],
};

/**
 * No MetaMetrics payloads when the user opts out during new wallet creation.
 */
export const newWalletMetricsOptOutExpectations: AnalyticsExpectations = {
  expectedTotalCount: 0,
};
