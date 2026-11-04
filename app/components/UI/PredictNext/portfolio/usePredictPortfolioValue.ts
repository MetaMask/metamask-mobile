import { usePredictAvailability } from '../availability';
import { usePredictImplementation } from '../implementation';
import { usePredictPortfolioValue as useLegacyPredictPortfolioValue } from './internal/legacy/usePredictPortfolioValue';
import type { PredictPortfolioValue } from './types';

const UNAVAILABLE: PredictPortfolioValue = { status: 'unavailable' };
const LOADING: PredictPortfolioValue = { status: 'loading' };

/**
 * The Active Venue's Predict portfolio value in USD. While Predict is
 * unavailable it is `unavailable` and reads nothing; while the Active Venue
 * resolves it is `loading`. The legacy branch passes
 * `usePredictPortfolio().portfolioValue` and its loading and error states
 * through unchanged. The next branch is `unavailable` until the Venue's
 * Portfolio Summary is wired here (PRED-1407); the legacy hook stays
 * disabled, so a next Venue never reports the legacy Venue's value.
 */
export const usePredictPortfolioValue = (): PredictPortfolioValue => {
  const isAvailable = usePredictAvailability();
  const resolution = usePredictImplementation();
  const isLegacy =
    resolution.status === 'ready' && resolution.implementation === 'legacy';
  const legacy = useLegacyPredictPortfolioValue({
    enabled: isAvailable && isLegacy,
  });

  if (!isAvailable) return UNAVAILABLE;
  if (resolution.status === 'resolving') return LOADING;
  return isLegacy ? legacy : UNAVAILABLE;
};
