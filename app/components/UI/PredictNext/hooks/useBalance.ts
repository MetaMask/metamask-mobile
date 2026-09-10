import { useQuery } from '@metamask/react-data-query';
import {
  portfolioQueries,
  type GetBalanceResult,
} from '../queries/portfolioQueries';
import type { PredictVenueId } from '../types';

export const useBalance = (venueId: PredictVenueId) =>
  useQuery<GetBalanceResult>({
    queryKey: portfolioQueries.getBalance(venueId).queryKey,
  });
