import { useQuery } from '@tanstack/react-query';
import {
  portfolioQueries,
  type GetBalanceResult,
} from '../queries/portfolioQueries';
import type { PredictVenueId } from '../types';

export const useBalance = (venueId: PredictVenueId) => {
  const descriptor = portfolioQueries.getBalance(venueId);

  return useQuery<GetBalanceResult>({
    queryKey: descriptor.queryKey,
    staleTime: descriptor.staleTime,
    // The service policy already retries retryable Balance failures. A
    // missing or invalid token must fail without automatic retries — the
    // app-wide query client defaults to retrying everything.
    retry: false,
  });
};
