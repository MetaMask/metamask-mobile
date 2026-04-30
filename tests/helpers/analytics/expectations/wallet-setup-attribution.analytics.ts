import type { AnalyticsExpectations } from '../../../framework';
import { onboardingEvents } from '../helpers';
import { importWalletWithMetricsOptInExpectations } from './import-wallet.analytics';
import { newWalletWithMetricsOptInExpectations } from './new-wallet.analytics';

/**
 * Values must match `withPreloadedMarketingAttributionForWalletSetupAnalytics` in
 * `tests/framework/fixtures/FixtureBuilder.ts`.
 */
export const E2E_WALLET_SETUP_ATTRIBUTION_FIXTURE_PROPS = {
  utm_source: 'fixture_utm_source',
  utm_medium: 'fixture_utm_medium',
  utm_campaign: 'fixture_utm_campaign',
  utm_term: 'fixture_utm_term',
  utm_content: 'fixture_utm_content',
  attribution_id: 'fixture_attribution_id',
} as const;

export const newWalletWithMetricsOptInAndAttributionExpectations: AnalyticsExpectations =
  {
    ...newWalletWithMetricsOptInExpectations,
    events: newWalletWithMetricsOptInExpectations.events?.map((e) =>
      e.name === onboardingEvents.WALLET_SETUP_COMPLETED
        ? {
            ...e,
            matchProperties: {
              ...e.matchProperties,
              ...E2E_WALLET_SETUP_ATTRIBUTION_FIXTURE_PROPS,
            },
          }
        : e,
    ),
  };

export const importWalletWithMetricsOptInAndAttributionExpectations: AnalyticsExpectations =
  {
    ...importWalletWithMetricsOptInExpectations,
    events: importWalletWithMetricsOptInExpectations.events?.map((e) =>
      e.name === onboardingEvents.WALLET_SETUP_COMPLETED
        ? {
            ...e,
            matchProperties: {
              ...e.matchProperties,
              ...E2E_WALLET_SETUP_ATTRIBUTION_FIXTURE_PROPS,
            },
          }
        : e,
    ),
  };
