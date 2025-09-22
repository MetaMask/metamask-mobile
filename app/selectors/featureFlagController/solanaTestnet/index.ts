import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectIsSolanaTestnetEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => remoteFeatureFlags.solanaTestnetsEnabled,
);
