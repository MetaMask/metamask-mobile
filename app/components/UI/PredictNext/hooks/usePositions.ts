import { useInfiniteQuery } from '@metamask/react-data-query';
import {
  portfolioQueries,
  type GetPositionsResult,
  type PortfolioPageParams,
} from '../queries/portfolioQueries';
import type { PredictVenueId } from '../types';

/** Reads a paginated open Positions list for a Venue. */
export const usePositions = (
  venueId: PredictVenueId,
  params: PortfolioPageParams,
) => {
  const descriptor = portfolioQueries.getPositions(venueId, params);

  return useInfiniteQuery<GetPositionsResult>({
    queryKey: descriptor.queryKey,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};
