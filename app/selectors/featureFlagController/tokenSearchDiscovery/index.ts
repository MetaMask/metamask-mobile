import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_TOKEN_SEARCH_DISCOVERY_ENABLED = false;
export const FEATURE_FLAG_NAME = 'tokenSearchDiscoveryEnabled';

export const tokenSearchDiscoveryEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME) ? remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean : DEFAULT_TOKEN_SEARCH_DISCOVERY_ENABLED,
);
