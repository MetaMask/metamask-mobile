import { useMemo } from 'react';
import type { PredictVenueId } from '../../../types';
import {
  usePortfolioSummaryState,
  type PortfolioSummaryState,
} from '../../portfolioSummaryState';
import type { PredictPortfolioValue } from '../../types';

const LOADING: PredictPortfolioValue = { status: 'loading' };
const ERROR: PredictPortfolioValue = { status: 'error' };

/** Keys the disabled Summary read while no next Venue is active. It never
 * fetches: `enabled` is false whenever this key is used. */
const NO_NEXT_VENUE = 'no-next-venue' as PredictVenueId;

/**
 * The only producer of the next branch's value. Its one numeric input is
 * the Summary's `totalValue`, which the C1 parser has already checked equals
 * `availableBalance + positionsValue + claimableValue`. A partial Summary
 * (`complete: false`) still counts: its total is a lower bound the contract
 * tells BalanceBreakdown to include.
 */
export const portfolioValueFromSummary = (
  state: PortfolioSummaryState,
): PredictPortfolioValue => {
  if (state.status === 'loading') return LOADING;
  if (state.status === 'error') return ERROR;
  const valueUsd = Number(state.summary.totalValue);
  return Number.isFinite(valueUsd) ? { status: 'ready', valueUsd } : ERROR;
};

/**
 * The next branch: the Active Venue's Portfolio Summary total. This module
 * reads nothing but the Summary; `usePredictPortfolioValue.test.ts` fails if
 * it loads a Positions or Activity hook or issues any other read.
 */
export const usePredictPortfolioValue = ({
  venueId,
}: {
  /** The active next Venue; absent while another branch is active. */
  venueId?: PredictVenueId;
}): PredictPortfolioValue => {
  const state = usePortfolioSummaryState(venueId ?? NO_NEXT_VENUE, {
    enabled: venueId !== undefined,
  });
  return useMemo(() => portfolioValueFromSummary(state), [state]);
};
