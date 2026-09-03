import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { parsePredictConfig } from '../config/predictConfig';

/** Reads the controller's already version-resolved, override-aware value. */
export const selectPredictConfig = createSelector(
  selectRemoteFeatureFlags,
  (flags) => parsePredictConfig(flags.predictConfig),
);
