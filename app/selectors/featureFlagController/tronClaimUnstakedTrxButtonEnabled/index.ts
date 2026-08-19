import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

export const selectTronClaimUnstakedTrxButtonEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tronClaimUnstakedTrxButtonEnabled] ??
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.tronClaimUnstakedTrxButtonEnabled
        ],
    ),
);
