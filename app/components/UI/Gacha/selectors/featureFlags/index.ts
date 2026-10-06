import { createSelector } from 'reselect';

import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { validatedVersionGatedFeatureFlag } from '../../../../../util/remoteFeatureFlag';

/**
 * Whether Gacha is enabled. A valid remote `gachaEnabled` flag wins, including
 * its kill switch. When the helper returns `undefined` (flag missing or
 * invalid, or `OVERRIDE_REMOTE_FEATURE_FLAGS=true`), development builds fall
 * back to `MM_GACHA_ENABLED`; release builds stay disabled.
 */
export const selectGachaEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag = __DEV__ && process.env.MM_GACHA_ENABLED === 'true';

    return (
      validatedVersionGatedFeatureFlag(remoteFeatureFlags?.gachaEnabled) ??
      localFlag
    );
  },
);
