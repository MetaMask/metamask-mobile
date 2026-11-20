import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';

export const ASSET_GLOBAL_WATCHLIST_FLAG_KEY = 'assetsGlobalWatchlistV1';
export const ASSET_UNIFIED_WATCHLIST_FLAG_KEY = 'assetsUnifiedWatchlistV1';

/**
 * Whether the global token watchlist feature is enabled for the current
 * client.
 */
export const selectTokenWatchlistEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[
      ASSET_GLOBAL_WATCHLIST_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * Whether the token watchlist may also present watched Perps markets.
 */
export const selectUnifiedWatchlistEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[
      ASSET_UNIFIED_WATCHLIST_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
