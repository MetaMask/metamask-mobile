import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectIsRpcFailoverEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => remoteFeatureFlags.walletFrameworkRpcFailoverEnabled,
);
