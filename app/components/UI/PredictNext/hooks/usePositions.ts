import { useInfiniteQuery } from '@metamask/react-data-query';
import {
  portfolioQueries,
  type GetPositionsResult,
  type PositionsPageParams,
} from '../queries/portfolioQueries';
import type { PredictVenueId } from '../types';

export interface UsePositionsOptions {
  enabled?: boolean;
}

/** Reads a paginated Positions list for a Venue: by status, then newest
 * holding first, unless `params.sort` asks for the top Positions by value. */
export const usePositions = (
  venueId: PredictVenueId,
  params: PositionsPageParams,
  options?: UsePositionsOptions,
) => {
  const descriptor = portfolioQueries.getPositions(venueId, params);

  return useInfiniteQuery<GetPositionsResult>({
    queryKey: descriptor.queryKey,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: options?.enabled,
  });
};
