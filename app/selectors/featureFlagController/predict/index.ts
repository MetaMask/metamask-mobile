import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectPredictEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags): boolean => Boolean(remoteFlags?.predictEnabled),
);
