import type {
  AnalyticsEventExpectation,
  AnalyticsExpectations,
} from '../../framework';
import { onboardingEvents } from './helpers';
import { E2E_WALLET_SETUP_ATTRIBUTION_FIELDS } from './walletSetupAttributionE2eConstants';

/**
 * Strengthens onboarding analytics expectations so `Wallet Setup Completed`
 * includes persisted acquisition fields from `withWalletSetupAttributionForE2e`.
 * Uses subset matching so enrichment (e.g. A/B tests) does not fail the spec.
 */
export function withStrictWalletSetupAttributionMatch(
  base: AnalyticsExpectations,
): AnalyticsExpectations {
  return {
    ...base,
    events: base.events?.map((ev): AnalyticsEventExpectation => {
      if (ev.name === onboardingEvents.ANALYTICS_PREFERENCE_SELECTED) {
        return {
          ...ev,
          matchProperties: {
            ...(ev.matchProperties ?? {}),
            has_marketing_consent: true,
          },
        };
      }
      if (ev.name !== onboardingEvents.WALLET_SETUP_COMPLETED) {
        return ev;
      }
      const { containProperties, matchProperties, ...rest } = ev;
      return {
        ...rest,
        containProperties: {
          ...(matchProperties ?? {}),
          ...(containProperties ?? {}),
          ...E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
        },
      };
    }),
  };
}
