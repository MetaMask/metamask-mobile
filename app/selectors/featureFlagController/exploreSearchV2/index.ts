import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/** Remote client-config key; LaunchDarkly alias should match for ops. */
export const FEATURE_FLAG_NAME = 'exploreSearchV2';

/**
 * When true, the Explore search uses Search V2 (tabbed); when false, V1.
 * Gated by both a remote `enabled` boolean and a `minimumVersion` semver string.
 */
export const selectExploreSearchV2Flag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    validatedVersionGatedFeatureFlag(remoteFeatureFlags[FEATURE_FLAG_NAME]) ??
    false,
);
