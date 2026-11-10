import { useEffect, useMemo } from 'react';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { usePositions } from '../../../hooks/usePositions';
import { PORTFOLIO_PAGE_LIMIT } from '../../../queries/portfolioQueries';
import type { PredictEvent } from '../../../types';
import { dedupeLatestPositions } from '../../../utils/positions';

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
    // The bound limits discovery, not usable pages already in the shared cache.
    // A repeated Position keeps its later copy: status and size can advance
    // across pages. Resolved holdings cannot be cashed out, so they stay on
    // Portfolio.
    const latest = dedupeLatestPositions(
      (data?.pages ?? []).map((page) => ({
        positions: page.positions.filter(
          (position) =>
            position.venueId === event.venueId &&
            marketIds.has(position.marketId),
        ),
      })),
    );
    return latest.filter((position) => position.status === 'open');
  }, [data, event.markets, event.venueId]);
};
