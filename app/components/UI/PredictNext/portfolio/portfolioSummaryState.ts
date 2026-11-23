import { useMemo } from 'react';
import { usePortfolioSummary } from '../hooks/usePortfolioSummary';
import type { PredictPortfolioSummary, PredictVenueId } from '../types';

/**
 * The Active Venue's Portfolio Summary as a surface may show it. `ready` is
 * the only state with figures. Nothing here ever stands in for a missing
 * Summary: no zero, no sum of loaded Positions.
 */
export type PortfolioSummaryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; summary: PredictPortfolioSummary };

interface SummaryRead {
  data?: PredictPortfolioSummary;
  isError: boolean;
}

const LOADING: PortfolioSummaryState = { status: 'loading' };
const ERROR: PortfolioSummaryState = { status: 'error' };

/**
 * Projects a Summary read for `venueId`. A failed read is an `error`,
 * including a failed refresh: the Summary still cached from before it is
 * stale, so it is not shown. A read without data is `loading`, including one
 * paused offline: an offline cold start is unknown, never $0. A Summary for
 * another Venue is an `error`: it is never this Venue's. A refresh in flight
 * keeps the last good Summary, which has not failed.
 */
export const projectPortfolioSummary = (
  read: SummaryRead,
  venueId: PredictVenueId,
): PortfolioSummaryState => {
  if (read.isError) return ERROR;
  if (!read.data) return LOADING;
  if (read.data.venueId !== venueId) return ERROR;
  return { status: 'ready', summary: read.data };
};

/**
 * The Venue's Portfolio Summary state. Every Home surface reads the Summary
 * through this one query, so the total and the PnL row always agree.
 */
export const usePortfolioSummaryState = (
  venueId: PredictVenueId,
  { enabled = true }: { enabled?: boolean } = {},
): PortfolioSummaryState => {
  const { data, isError } = usePortfolioSummary(venueId, { enabled });
  return useMemo(
    () => projectPortfolioSummary({ data, isError }, venueId),
    [data, isError, venueId],
  );
};
