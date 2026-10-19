import { useInfiniteQuery } from '@metamask/react-data-query';
import {
  portfolioQueries,
  type GetActivityResult,
  type PortfolioPageParams,
} from '../queries/portfolioQueries';
import type { PredictVenueId } from '../types';

export interface UseActivityOptions {
  enabled?: boolean;
}

/** Reads a paginated Activity list (Fills and Settlements) for a Venue. */
export const useActivity = (
  venueId: PredictVenueId,
  params: PortfolioPageParams,
  options?: UseActivityOptions,
) => {
  const descriptor = portfolioQueries.getActivity(venueId, params);

  return useInfiniteQuery<GetActivityResult>({
    queryKey: descriptor.queryKey,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: options?.enabled,
  });
};
