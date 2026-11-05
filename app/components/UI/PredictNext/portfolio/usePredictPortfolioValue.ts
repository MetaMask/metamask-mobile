import { usePredictAvailability } from '../availability';
import { usePredictImplementation } from '../implementation';
import { usePredictPortfolioValue as useLegacyPredictPortfolioValue } from './internal/legacy/usePredictPortfolioValue';
import { usePredictPortfolioValue as useNextPredictPortfolioValue } from './internal/next/usePredictPortfolioValue';
import type { PredictPortfolioValue } from './types';

const UNAVAILABLE: PredictPortfolioValue = { status: 'unavailable' };
const LOADING: PredictPortfolioValue = { status: 'loading' };

/**
 * The Active Venue's Predict portfolio value in USD. While Predict is
 * unavailable it is `unavailable` and reads nothing; while the Active Venue
 * resolves it is `loading`. The legacy branch passes
 * `usePredictPortfolio().portfolioValue` and its loading and error states
 * through unchanged. The next branch is the Venue's Portfolio Summary total,
 * never a sum of Positions. Only the active branch reads anything, and the
 * branch is picked in the same render as the Venue, so one Venue's value is
 * never reported for another.
 */
export const usePredictPortfolioValue = (): PredictPortfolioValue => {
  const isAvailable = usePredictAvailability();
  const resolution = usePredictImplementation();
  const isLegacy =
    resolution.status === 'ready' && resolution.implementation === 'legacy';
  const nextVenueId =
    isAvailable &&
    resolution.status === 'ready' &&
    resolution.implementation === 'next'
      ? resolution.venueId
      : undefined;
  const legacy = useLegacyPredictPortfolioValue({
    enabled: isAvailable && isLegacy,
  });
  const next = useNextPredictPortfolioValue({ venueId: nextVenueId });

  if (!isAvailable) return UNAVAILABLE;
  if (resolution.status === 'resolving') return LOADING;
  return isLegacy ? legacy : next;
};
