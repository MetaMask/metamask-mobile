import { createSelector } from 'reselect';

export const OVERRIDE_PREDICT_ENABLED_VALUE = false;
export const FEATURE_FLAG_NAME = 'predictEnabled';

export const selectPredictEnabledFlag = createSelector(
  // selectRemoteFeatureFlags,
  // (remoteFlags) =>
  //   hasProperty(remoteFlags, FEATURE_FLAG_NAME)
  //     ? Boolean(remoteFlags[FEATURE_FLAG_NAME])
  //     : OVERRIDE_PREDICT_ENABLED_VALUE,
  () => true, // NOTE: manually overriding for browserstack build
);
