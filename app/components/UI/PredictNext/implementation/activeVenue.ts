import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { PredictConfig } from '../config/predictConfig';
import { selectPredictConfig } from '../selectors/predictConfig';
import type { ActiveVenueResolution, PredictConfiguredVenue } from './types';

/**
 * Temporary rollout rule: Kalshi only when it is the sole enabled Venue.
 * PRED-1377 replaces it with Venue Selection Preference and geolocation
 * precedence behind {@link useActiveVenue}.
 */
export const resolveActiveVenue = (
  config: PredictConfig,
): PredictConfiguredVenue => {
  if (!config.enabled) {
    return 'polymarket';
  }
  return config.venues.kalshi.enabled && !config.venues.polymarket.enabled
    ? 'kalshi'
    : 'polymarket';
};

/** Resolves the Active Venue. Today's config rule is always ready. */
export const useActiveVenue = (): ActiveVenueResolution => {
  const config = useSelector(selectPredictConfig);
  const venue = resolveActiveVenue(config);

  return useMemo(() => ({ status: 'ready', venue }), [venue]);
};
