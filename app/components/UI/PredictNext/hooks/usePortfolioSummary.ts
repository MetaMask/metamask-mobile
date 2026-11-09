import { useQuery } from '@tanstack/react-query';
import {
  portfolioQueries,
  type GetPortfolioSummaryResult,
} from '../queries/portfolioQueries';
import type { PredictVenueId } from '../types';

export interface UsePortfolioSummaryOptions {
  enabled?: boolean;
}

/** Reads the backend-computed Portfolio Summary for a Venue: totals over
 * every holding, never a loaded Positions page. */
export const usePortfolioSummary = (
  venueId: PredictVenueId,
  options?: UsePortfolioSummaryOptions,
) => {
  const descriptor = portfolioQueries.getPortfolioSummary(venueId);

  return useQuery<GetPortfolioSummaryResult>({
    queryKey: descriptor.queryKey,
    staleTime: descriptor.staleTime,
    // The service policy already retries retryable failures. A missing or
    // invalid token must fail without automatic retries — the app-wide
    // query client defaults to retrying everything.
    retry: false,
    ...(options?.enabled === undefined ? {} : { enabled: options.enabled }),
  });
};
