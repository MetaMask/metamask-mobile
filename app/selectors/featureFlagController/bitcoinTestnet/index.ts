import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectIsBitcoinTestnetEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => remoteFeatureFlags.bitcoinTestnetsEnabled,
);
