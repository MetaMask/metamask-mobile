import { useQuery } from '@tanstack/react-query';
import {
  portfolioQueries,
  type GetPortfolioSummaryResult,
} from '../queries/portfolioQueries';
import type { PredictVenueId } from '../types';

/** Reads the backend-computed Portfolio Summary for a Venue: totals over
 * every holding, never a loaded Positions page. */
export const usePortfolioSummary = (venueId: PredictVenueId) => {
  const descriptor = portfolioQueries.getPortfolioSummary(venueId);

  return useQuery<GetPortfolioSummaryResult>({
    queryKey: descriptor.queryKey,
    staleTime: descriptor.staleTime,
    // The service policy already retries retryable failures. A missing or
    // invalid token must fail without automatic retries — the app-wide
    // query client defaults to retrying everything.
    retry: false,
  });
};
