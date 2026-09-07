import { useQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type GetMarketHistoryResult,
} from '../queries/marketDataQueries';
import type {
  PredictEntityId,
  PredictMarketHistoryRange,
  PredictVenueId,
} from '../types';

/** Reads historical Yes prices for one Market. */
export const useMarketHistory = (
  venueId: PredictVenueId,
  marketId: PredictEntityId,
  range: PredictMarketHistoryRange,
) =>
  useQuery<GetMarketHistoryResult>({
    queryKey: marketDataQueries.getMarketHistory(venueId, marketId, range)
      .queryKey,
  });
