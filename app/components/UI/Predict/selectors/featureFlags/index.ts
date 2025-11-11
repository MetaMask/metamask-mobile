import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';

export const OVERRIDE_PREDICT_ENABLED_VALUE = false;
export const FEATURE_FLAG_NAME = 'predictEnabled';

export const selectPredictEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags) =>
    hasProperty(remoteFlags, FEATURE_FLAG_NAME)
      ? Boolean(remoteFlags[FEATURE_FLAG_NAME])
      : OVERRIDE_PREDICT_ENABLED_VALUE,
);

export const selectPredictGtmOnboardingModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PREDICT_GTM_MODAL_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.predictGtmOnboardingModalEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
