import type {
  AnalyticsEventExpectation,
  AnalyticsExpectations,
} from '../../framework';
import { onboardingEvents } from './helpers';
import { E2E_WALLET_SETUP_ATTRIBUTION_FIELDS } from './walletSetupAttributionE2eConstants';

/**
 * Strengthens `Wallet Setup Completed` to an exact property match that includes
 * persisted acquisition fields from `withWalletSetupAttributionForE2e`.
 */
export function withStrictWalletSetupAttributionMatch(
  base: AnalyticsExpectations,
): AnalyticsExpectations {
  return {
    ...base,
    events: base.events?.map((ev): AnalyticsEventExpectation => {
      if (ev.name !== onboardingEvents.WALLET_SETUP_COMPLETED) {
        return ev;
      }
      const { containProperties: _unused, matchProperties, ...rest } = ev;
      return {
        ...rest,
        matchProperties: {
          ...(matchProperties ?? {}),
          ...E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
        },
      };
    }),
  };
}
