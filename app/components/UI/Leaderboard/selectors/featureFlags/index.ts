import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';

/**
 * Selector for Leaderboard feature enablement
 *
 * Uses version-gated feature flag `leaderboardEnabled` from remote config.
 * Falls back to local environment variable if remote flag is unavailable.
 *
 * @returns {boolean} True if feature is enabled and version requirement is met
 */
export const selectLeaderboardEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_LEADERBOARD_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.leaderboardEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
