import {
  getDefaultAnalyticsControllerState,
  type AnalyticsControllerState,
} from '@metamask/analytics-controller';
import type { WalletOptions } from '@metamask/wallet';
import { createPlatformAdapter } from '../../controllers/analytics-controller/platform-adapter';
import { createPlatformAdapter as createE2EPlatformAdapter } from '../../controllers/analytics-controller/platform-adapter-e2e';
import { hasTestOverrides } from '../../../../util/test/utils';
import { getBrazePlugin } from '../../../Braze';
import AppVersionSegmentPlugin from '../../../../util/analytics/appVersionSegmentPlugin';

type AnalyticsControllerInstanceOptions =
  WalletOptions['instanceOptions']['analyticsController'];

type WalletState = NonNullable<WalletOptions['state']>;

/**
 * Builds the mobile AnalyticsController instance options for the wallet.
 *
 * @param analyticsId - The analytics ID read from MMKV.
 * @returns The mobile AnalyticsController instance options.
 */
export function getAnalyticsControllerInstanceOptions(
  analyticsId: string,
): AnalyticsControllerInstanceOptions {
  return {
    platformAdapter: hasTestOverrides
      ? createE2EPlatformAdapter()
      : createPlatformAdapter([
          getBrazePlugin(),
          new AppVersionSegmentPlugin(),
        ]),
    analyticsId,
    isAnonymousEventsFeatureEnabled: true,
    // Geolocation enrichment is intentionally disabled, so the controller
    // never calls `GeolocationController:getGeolocationData`.
    isGeolocationEnabled: false,
  };
}

/**
 * Returns the wallet state with the persisted AnalyticsController slice
 * normalized for mobile.
 *
 * The wallet prefers a persisted `analyticsId` over the one passed through
 * instance options, but on mobile MMKV is the identity source, so the
 * persisted value is always replaced. Defaults fill fields added after a
 * user's last launch, and the persisted slice then wins so marketing consent,
 * eventsConfig, and queued payloads survive restart.
 *
 * @param state - The persisted wallet state.
 * @param analyticsId - The analytics ID read from MMKV.
 * @returns The wallet state with a normalized AnalyticsController slice.
 */
export function withMobileAnalyticsControllerState(
  state: WalletState,
  analyticsId: string,
): WalletState {
  const persistedAnalyticsState = (state.AnalyticsController ??
    {}) as Partial<AnalyticsControllerState>;
  const defaultState = getDefaultAnalyticsControllerState();

  const analyticsControllerState: AnalyticsControllerState = {
    ...defaultState,
    ...persistedAnalyticsState,
    optedIn: persistedAnalyticsState.optedIn ?? defaultState.optedIn,
    consentDecisionMade:
      persistedAnalyticsState.consentDecisionMade ??
      defaultState.consentDecisionMade,
    analyticsId,
  };

  return {
    ...state,
    AnalyticsController: analyticsControllerState as WalletState[string],
  };
}
