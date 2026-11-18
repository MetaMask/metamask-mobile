import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/** Slow connection banner on wallet home. */
export const selectSlowNetworkBannerEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    validatedVersionGatedFeatureFlag(
      remoteFeatureFlags?.[FeatureFlagNames.slowNetworkBanner],
    ) ?? false,
);
