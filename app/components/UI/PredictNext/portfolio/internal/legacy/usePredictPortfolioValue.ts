import { useMemo } from 'react';
import { usePredictPortfolio } from '../../../../Predict/hooks/usePredictPortfolio';
import type { PredictPortfolioValue } from '../../types';

const LOADING: PredictPortfolioValue = { status: 'loading' };
const ERROR: PredictPortfolioValue = { status: 'error' };

/**
 * The legacy branch: today's `usePredictPortfolio().portfolioValue`, with
 * its loading and error states, passed through unchanged. An error wins over
 * loading, as it always has.
 */
export const usePredictPortfolioValue = ({
  enabled,
}: {
  enabled: boolean;
}): PredictPortfolioValue => {
  const { portfolioValue, isLoading, error } = usePredictPortfolio({
    enabled,
    // The Homepage Predictions section owns the live-price subscription and
    // updates the shared positions query cache this value is read from.
    livePriceUpdates: false,
  });

  return useMemo(() => {
    if (error) return ERROR;
    if (isLoading) return LOADING;
    return { status: 'ready', valueUsd: portfolioValue };
  }, [error, isLoading, portfolioValue]);
};
