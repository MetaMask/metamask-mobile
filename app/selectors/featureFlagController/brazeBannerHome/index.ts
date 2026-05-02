import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Registry / client-config key for the Braze banner shown on the home/wallet screen.
 */
export const BRAZE_BANNER_HOME_FLAG_KEY = 'brazeBannerHome' as const;

/**
 * Whether the Braze banner should be shown on the home/wallet screen.
 *
 * LaunchDarkly variation value (direct or wrapped in `{ value: ... }`):
 * `{ "enabled": true | false, "minimumVersion": "x.x.x" }`
 *
 * Returns `true` only when `enabled` is true and the app version satisfies `minimumVersion`.
 * Otherwise `false`, including invalid or missing payloads.
 */
export const selectBrazeBannerHomeFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[BRAZE_BANNER_HOME_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
