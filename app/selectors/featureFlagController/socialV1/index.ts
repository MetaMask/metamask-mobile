import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags, selectFeatureFlagThresholdGroups } from '..';
import { selectSocialLeaderboardEnabled } from '../socialLeaderboard';
import { selectHasSocialEarlyAccess } from '../../../core/redux/slices/socialEarlyAccess';
import { SOCIAL_V1_AB_KEY, SocialV1Variant } from '../../../constants/socialV1';
import { resolveABTestAssignment } from '../../../util/abTest';

/** The user's TSA-1122 bucket alone, without early access. */
export const selectIsSocialV1Treatment = createSelector(
  selectRemoteFeatureFlags,
  selectFeatureFlagThresholdGroups,
  (remoteFeatureFlags, thresholdGroups) =>
    resolveABTestAssignment(
      remoteFeatureFlags,
      SOCIAL_V1_AB_KEY,
      Object.values(SocialV1Variant),
      thresholdGroups,
    ).variantName === SocialV1Variant.Treatment,
);

/** Social V1 bundle access: the treatment bucket, or early access whatever the bucket. */
export const selectHasSocialV1Access = createSelector(
  selectIsSocialV1Treatment,
  selectHasSocialEarlyAccess,
  (isTreatment, hasEarlyAccess) => isTreatment || hasEarlyAccess,
);

/**
 * Social V1 surfaces that also require the leaderboard flag. Early access
 * skips that flag too.
 */
export const selectIsSocialV1Enabled = createSelector(
  selectSocialLeaderboardEnabled,
  selectIsSocialV1Treatment,
  selectHasSocialEarlyAccess,
  (isSocialLeaderboardEnabled, isTreatment, hasEarlyAccess) =>
    hasEarlyAccess || (isSocialLeaderboardEnabled && isTreatment),
);
