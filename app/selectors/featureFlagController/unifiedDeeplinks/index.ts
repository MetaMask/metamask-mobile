import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_UNIFIED_DEEPLINKS_ENABLED = false;
export const FEATURE_FLAG_NAME = 'unifiedDeeplinksEnabled';

/**
 * Selector for the unified deeplinks feature flag
 * This flag controls whether to use the new unified deeplink service
 * or the legacy implementation
 */
export const selectUnifiedDeeplinksEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    // Check for environment variable override (for testing)
    if (process.env.USE_UNIFIED_DEEPLINK_SERVICE === 'true') {
      return true;
    }

    if (!hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)) {
      return DEFAULT_UNIFIED_DEEPLINKS_ENABLED;
    }

    const remoteFlag = remoteFeatureFlags[
      FEATURE_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_UNIFIED_DEEPLINKS_ENABLED
    );
  },
);
