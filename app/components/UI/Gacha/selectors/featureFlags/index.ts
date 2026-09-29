import { createSelector } from 'reselect';

import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { validatedVersionGatedFeatureFlag } from '../../../../../util/remoteFeatureFlag';

/** Whether the version-gated Gacha remote flag is enabled. */
export const selectGachaEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    validatedVersionGatedFeatureFlag(remoteFeatureFlags?.gachaEnabled) ?? false,
);
