import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';

export const OVERRIDE_PREDICT_ENABLED_VALUE = false;
export const FEATURE_FLAG_NAME = 'predictEnabled';

export const selectPredictEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags) =>
    hasProperty(remoteFlags, FEATURE_FLAG_NAME)
      ? Boolean(remoteFlags[FEATURE_FLAG_NAME])
      : OVERRIDE_PREDICT_ENABLED_VALUE,
);
