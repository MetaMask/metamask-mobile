import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectVipProgramEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const flag = remoteFeatureFlags?.vipProgramEnabled;
    return flag === true;
  },
);
