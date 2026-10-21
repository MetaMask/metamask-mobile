import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags, selectFeatureFlagThresholdGroups } from '..';
import { selectSocialLeaderboardEnabled } from '../socialLeaderboard';
import { SOCIAL_V1_AB_KEY, SocialV1Variant } from '../../../constants/socialV1';
import { resolveABTestAssignment } from '../../../util/abTest';

/**
 * Social V1 is enabled when the social leaderboard flag is on AND the
 * TSA-1122 A/B test assigned the treatment variant. Follows the Perps
 * precedent (`selectIsPerpsSocialEnabled`): the variant resolves from the
 * flag value first, then the threshold group, and falls back to control —
 * so undefined/invalid flag shapes default to false.
 *
 * Assignment-only read: this selector never emits an exposure event.
 * Exposure stays in the Social V1 experiment surface.
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
