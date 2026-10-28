import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { parsePredictConfig } from '../config/predictConfig';

const LOCAL_FLIP_CONFIG = {
  enabled: true,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: false },
};

/** Reads the controller's already version-resolved, override-aware value. */
export const selectPredictConfig = createSelector(
  selectRemoteFeatureFlags,
  // (flags) => parsePredictConfig(flags.predictConfig),
  (flags) => LOCAL_FLIP_CONFIG,
);
