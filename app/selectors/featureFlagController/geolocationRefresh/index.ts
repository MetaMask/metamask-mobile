import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Whether geolocation is refreshed on network changes, app foreground, and
 * unlock, so geo-gated features update without restarting the app.
 * Falls back to `MM_GEOLOCATION_REFRESH_ENABLED` when the remote flag is
 * absent, invalid, or overridden.
 */
export const selectGeolocationRefreshEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags[
      FeatureFlagNames.geolocationRefreshOnNetworkChange
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      process.env.MM_GEOLOCATION_REFRESH_ENABLED === 'true'
    );
  },
);
