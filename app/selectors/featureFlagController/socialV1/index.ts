import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags, selectFeatureFlagThresholdGroups } from '..';
import { selectSocialLeaderboardEnabled } from '../socialLeaderboard';
import { SOCIAL_V1_AB_KEY, SocialV1Variant } from '../../../constants/socialV1';
import { resolveABTestAssignment } from '../../../util/abTest';

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
