import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Registry / client-config key — camelCase like `tokenDetailsAdvancedCharts`,
 * `tokenDetailsOhlcvWsIntegration`, etc.
 */
export const ASSET_DETAILS_SHOW_QUICK_BUY_FLAG_KEY =
  'assetDetailsShowQuickBuy' as const;

/**
 * Whether the Quick Buy entry point (lightning button + bottom sheet) is shown
 * on the Token (Asset) Details screen.
 *
 * LaunchDarkly variation value (direct or wrapped in `{ value: ... }`):
 * `{ "enabled": true | false, "minimumVersion": "7.73" }`
 *
 * Returns `true` only when `enabled` is true and the app version satisfies
 * `minimumVersion`. Otherwise `false`, including invalid or missing payloads.
 */
export const selectAssetDetailsShowQuickBuyEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag =
      remoteFeatureFlags?.[ASSET_DETAILS_SHOW_QUICK_BUY_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
