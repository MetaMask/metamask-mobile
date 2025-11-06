import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectTrxStakingEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => remoteFeatureFlags.trxStakingEnabled,
);
