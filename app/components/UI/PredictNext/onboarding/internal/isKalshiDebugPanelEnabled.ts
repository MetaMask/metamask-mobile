import {
  resolveVenueAuthProfile,
  type PredictConfig,
} from '../../config/predictConfig';

/**
 * Temporary Kalshi demo debug. Development builds only, and only while this
 * build's predict config turns Kalshi authentication on. Release builds and
 * Polymarket-only configs render nothing.
 */
export const isKalshiDebugPanelEnabled = (
  isDevelopmentBuild: boolean,
  config: PredictConfig,
): boolean =>
  isDevelopmentBuild && resolveVenueAuthProfile(config) !== undefined;
