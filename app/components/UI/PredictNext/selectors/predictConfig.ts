import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  isCryptoUpDownEnabled,
  parsePredictConfig,
} from '../config/predictConfig';

/** Reads the controller's already version-resolved, override-aware value. */
export const selectPredictConfig = createSelector(
  selectRemoteFeatureFlags,
  (flags) => parsePredictConfig(flags.predictConfig),
);

/** Whether the Kalshi crypto Up/Down cards may show. Default off. */
export const selectPredictCryptoUpDownEnabled = createSelector(
  selectPredictConfig,
  isCryptoUpDownEnabled,
);
