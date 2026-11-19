import { createSelector } from 'reselect';

import { isCollectiblesBuildEnabled } from '../../../../constants/featureFlags';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

/**
 * Whether Collectibles is enabled. A valid remote `collectiblesEnabled` flag wins, including
 * its kill switch. When the helper returns `undefined` (flag missing or
 * invalid, or `OVERRIDE_REMOTE_FEATURE_FLAGS=true`), development builds fall
 * back to `MM_COLLECTIBLES_ENABLED`; release builds stay disabled.
 */
export const selectCollectiblesEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag = __DEV__ && isCollectiblesBuildEnabled();

    return (
      validatedVersionGatedFeatureFlag(
        remoteFeatureFlags?.collectiblesEnabled,
      ) ?? localFlag
    );
  },
);
