import { useEffect, useMemo } from 'react';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { usePositions } from '../../../hooks/usePositions';
import { PORTFOLIO_PAGE_LIMIT } from '../../../queries/portfolioQueries';
import type { PredictEvent, PredictPosition } from '../../../types';

const PAGE_PARAMS = { limit: PORTFOLIO_PAGE_LIMIT };
/** Includes the initial page, matching the existing Event Screen discovery bound. */
const MAX_DISCOVERY_PAGES = 5;

/** Discovers available Event holdings through the shared venue-wide cache. */
export const useEventPositions = (event: PredictEvent) => {
  const networkTier = useNetworkTier();
  const canFetch = networkTier !== 'NONE';
  const { data, isError, isFetching, hasNextPage, fetchNextPage } =
    usePositions(event.venueId, PAGE_PARAMS, { enabled: canFetch });

  useEffect(() => {
    if (
      !canFetch ||
      !data ||
      isError ||
      isFetching ||
      !hasNextPage ||
      data.pages.length >= MAX_DISCOVERY_PAGES
    ) {
      return;
    }

    // Do not cancel a shared refresh or retry a failed next page. A successful
    // service refetch/invalidation can resume discovery through the same cache.
    fetchNextPage({ cancelRefetch: false }).catch(() => undefined);
  }, [canFetch, data, fetchNextPage, hasNextPage, isError, isFetching]);

  return useMemo(() => {
    const marketIds = new Set(event.markets.map((market) => market.id));
    const seen = new Set<string>();
    const positions: PredictPosition[] = [];
    // The bound limits discovery, not usable pages already in the shared cache.
    for (const page of data?.pages ?? []) {
      for (const position of page.positions) {
        if (
          position.venueId !== event.venueId ||
          !marketIds.has(position.marketId)
        ) {
          continue;
        }
        const key = JSON.stringify([
          position.venueId,
          position.marketId,
          position.side,
        ]);
        if (!seen.has(key)) {
          seen.add(key);
          positions.push(position);
        }
      }
    }
    return positions;
  }, [data, event.markets, event.venueId]);
};
