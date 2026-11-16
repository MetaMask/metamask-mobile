import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * RPC failover is on unless `corePlatformRpcFailoverMode` is `disabled`.
 * `NetworkController` ignores an absent or unrecognized value and keeps its
 * default mode (`enabled`), so we do the same here.
 */
export const selectIsRpcFailoverEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    remoteFeatureFlags.corePlatformRpcFailoverMode !== 'disabled',
);
