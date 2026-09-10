import { useQuery } from '@metamask/react-data-query';
import {
  portfolioQueries,
  type GetBalanceResult,
} from '../queries/portfolioQueries';
import type { PredictVenueId } from '../types';

export const useBalance = (venueId: PredictVenueId) =>
  useQuery<GetBalanceResult>({
    queryKey: portfolioQueries.getBalance(venueId).queryKey,
    // The service policy already retries retryable Balance failures. A
    // missing or invalid token must fail without automatic retries — the
    // app-wide query client defaults to retrying everything.
    retry: false,
  });
