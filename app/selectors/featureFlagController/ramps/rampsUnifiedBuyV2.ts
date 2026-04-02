import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const RAMPS_UNIFIED_BUY_V2_FLAG_KEY = 'rampsUnifiedBuyV2';

export const selectRampsUnifiedBuyV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags[
      RAMPS_UNIFIED_BUY_V2_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
