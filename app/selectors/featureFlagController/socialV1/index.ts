import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags, selectFeatureFlagThresholdGroups } from '..';
import { selectSocialLeaderboardEnabled } from '../socialLeaderboard';
import { SOCIAL_V1_AB_KEY, SocialV1Variant } from '../../../constants/socialV1';
import { resolveABTestAssignment } from '../../../util/abTest';

/**
 * Social V1: leaderboard flag on AND TSA-1122 treatment.
 * Assignment-only — never emits an exposure event.
 */
export const selectIsSocialV1Enabled = createSelector(
  selectSocialLeaderboardEnabled,
  selectRemoteFeatureFlags,
  selectFeatureFlagThresholdGroups,
  (isSocialLeaderboardEnabled, remoteFeatureFlags, thresholdGroups) =>
    isSocialLeaderboardEnabled &&
    resolveABTestAssignment(
      remoteFeatureFlags,
      SOCIAL_V1_AB_KEY,
      Object.values(SocialV1Variant),
      thresholdGroups,
    ).variantName === SocialV1Variant.Treatment,
);
