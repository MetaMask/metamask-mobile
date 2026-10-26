import type { WalletOptions } from '@metamask/wallet';
import { hasTestOverrides } from '../../../../util/test/utils';
import AppVersionSegmentPlugin from '../../../../util/analytics/appVersionSegmentPlugin';
import { getBrazePlugin } from '../../../Braze';
import { createPlatformAdapter } from '../../controllers/analytics-controller/platform-adapter';
import { createPlatformAdapter as createE2EPlatformAdapter } from '../../controllers/analytics-controller/platform-adapter-e2e';

type AnalyticsControllerInstanceOptions =
  WalletOptions['instanceOptions']['analyticsController'];

/**
 * Build the client-specific `AnalyticsController` options for `@metamask/wallet`.
 *
 * The wallet owns the controller messenger and persisted state. `platformAdapter`
 * and `analyticsId` have no package default, and anonymous events stay on so
 * pre-consent metrics keep the mobile behavior from before wallet 19.
 *
 * @param analyticsId - MMKV analytics id. A non-empty persisted id still wins
 * inside the wallet unless the caller stamps this value onto persisted state.
 * @returns The AnalyticsController instance options.
 */
export function getAnalyticsControllerInstanceOptions(
  analyticsId: string,
): AnalyticsControllerInstanceOptions {
  const platformAdapter = hasTestOverrides
    ? createE2EPlatformAdapter()
    : createPlatformAdapter([getBrazePlugin(), new AppVersionSegmentPlugin()]);

  return {
    platformAdapter,
    analyticsId,
    isAnonymousEventsFeatureEnabled: true,
    // Geolocation enrichment stays off. The controller then never calls
    // `GeolocationController:getGeolocationData`.
    isGeolocationEnabled: false,
  };
}
