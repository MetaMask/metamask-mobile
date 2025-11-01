import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { getFeatureFlagValue } from '../../../../selectors/featureFlagController/env';
import { hasProperty } from '@metamask/utils';

const DEFAULT_SAMPLE_FEATURE_COUNTER_ENABLED = true;
export const FEATURE_FLAG_NAME = 'sampleFeatureCounterEnabled';

export const selectSampleFeatureCounterEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteValue = hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_SAMPLE_FEATURE_COUNTER_ENABLED;

    return getFeatureFlagValue(
      process.env.MM_SAMPLE_FEATURE_COUNTER_ENABLED,
      remoteValue,
    );
  },
);
