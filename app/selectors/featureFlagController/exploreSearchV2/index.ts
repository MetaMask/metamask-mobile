import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_EXPLORE_SEARCH_V2_ENABLED = false;

/** Remote client-config key; LaunchDarkly alias should match for ops. */
export const FEATURE_FLAG_NAME = 'exploreSearchV2Enabled';

/**
 * When true, the Explore search uses Search V2 (tabbed); when false, V1.
 */
export const selectExploreSearchV2EnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_EXPLORE_SEARCH_V2_ENABLED,
);
