import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_TOKEN_DISCOVERY_BROWSER_ENABLED = false;
export const FEATURE_FLAG_NAME = 'tokenDiscoveryBrowserEnabled';

export const tokenDiscoveryBrowserEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME) ? remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean : DEFAULT_TOKEN_DISCOVERY_BROWSER_ENABLED,
);
