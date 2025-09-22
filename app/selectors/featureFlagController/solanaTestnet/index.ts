import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectIsSolanaTestnetEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    console.log('remoteFeatureFlags.solanaTestnetsEnabled', remoteFeatureFlags.solanaTestnetsEnabled)
    return true
  }
);
