import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';

export const OVERRIDE_PREDICT_ENABLED_VALUE = false;
export const FEATURE_FLAG_NAME = 'predictEnabled';

export const selectPredictEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags) => {
    if (FEATURE_FLAG_NAME in remoteFlags) {
      return Boolean(remoteFlags[FEATURE_FLAG_NAME]);
    }
    return OVERRIDE_PREDICT_ENABLED_VALUE;
  },
);
