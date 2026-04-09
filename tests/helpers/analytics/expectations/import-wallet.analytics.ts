import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';

const importWalletFlowExpectedEventNames = [
  onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
  onboardingEvents.WALLET_IMPORTED,
  onboardingEvents.WALLET_SETUP_COMPLETED,
  onboardingEvents.WALLET_IMPORT_STARTED,
  onboardingEvents.WALLET_IMPORT_ATTEMPTED,
];

/**
 * Expected MetaMetrics payloads after importing a wallet with metrics opt-in.
 */
export const importWalletWithMetricsOptInExpectations: AnalyticsExpectations = {
  eventNames: importWalletFlowExpectedEventNames,
  expectedTotalCount: importWalletFlowExpectedEventNames.length,
  events: [
    {
      name: onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
      matchProperties: {
        has_marketing_consent: false,
        is_metrics_opted_in: true,
        location: 'onboarding_metametrics',
        updated_after_onboarding: false,
        account_type: 'imported',
      },
    },
    {
      name: onboardingEvents.WALLET_IMPORT_STARTED,
      matchProperties: {
        account_type: 'imported',
      },
    },
    {
      name: onboardingEvents.WALLET_IMPORT_ATTEMPTED,
      matchProperties: {},
    },
    {
      name: onboardingEvents.WALLET_IMPORTED,
      matchProperties: {
        biometrics_enabled: false,
      },
    },
    {
      name: onboardingEvents.WALLET_SETUP_COMPLETED,
      matchProperties: {
        wallet_setup_type: 'import',
        new_wallet: false,
        account_type: 'imported',
      },
    },
  ],
};

/**
 * No MetaMetrics payloads when the user opts out during onboarding import.
 */
export const importWalletMetricsOptOutExpectations: AnalyticsExpectations = {
  expectedTotalCount: 0,
};
