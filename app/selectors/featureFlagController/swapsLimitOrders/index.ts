import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

export const selectSwapsLimitOrdersEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags?.swapsLimitOrders;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
