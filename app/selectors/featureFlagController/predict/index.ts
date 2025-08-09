import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_PREDICT_ENABLED = false;
export const FEATURE_FLAG_NAME = 'predictEnabled';

export const selectPredictEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags) =>
    hasProperty(remoteFlags, FEATURE_FLAG_NAME)
      ? (remoteFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_PREDICT_ENABLED,
);
