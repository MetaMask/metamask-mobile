import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';

/**
 * LaunchDarkly key for the global token watchlist feature.
 *
 * The flag uses a version-gated JSON variation so we can roll out
 * gradually and enforce a minimum app version:
 * `{ "enabled": true | false, "minimumVersion": "<semver>" }`
 *
 * @see https://consensyssoftware.atlassian.net/browse/ASSETS-3114
 */
export const ASSET_GLOBAL_WATCHLIST_FLAG_KEY = 'assets-global-watchlist-v1';

/**
 * Whether the global token watchlist feature is enabled for the current
 * client. Returns `true` only when the remote flag is `enabled` and the
 * running app version satisfies the configured `minimumVersion`.
 * Falls back to `false` for missing or malformed payloads.
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
