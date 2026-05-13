import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_EXPLORE_PAGE_V2_ENABLED = false;

/** Remote client-config key; LaunchDarkly alias should match for ops. */
export const FEATURE_FLAG_NAME = 'explorePageV2Enabled';

/**
 * When true, the Explore tab uses Explore Page V2; when false, V1.
 */
export const selectExplorePageV2EnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_EXPLORE_PAGE_V2_ENABLED,
);
