import { useState, useEffect, useCallback, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { fetchRwas, type TrendingAsset } from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import {
  PriceChangeOption,
  SortDirection,
} from '../../components/TrendingTokensBottomSheet';
import { RWA_CHAIN_IDS } from '../../utils/trendingNetworksList';

const RWA_PAGE_SIZE = 100;
const DEFAULT_SORT_OPTION = PriceChangeOption.PriceChange;
const DEFAULT_SORT_DIRECTION = SortDirection.Descending;

type FetchRwasParams = Parameters<typeof fetchRwas>[0];
type RwaSortBy = NonNullable<FetchRwasParams>['sortBy'];
type RwaToken = Awaited<ReturnType<typeof fetchRwas>>['data'][number];

const buildSortBy = (
  option: PriceChangeOption,
  direction: SortDirection,
): RwaSortBy => {
  switch (option) {
    case PriceChangeOption.Volume:
      return direction === SortDirection.Ascending
        ? 'volume_asc'
        : 'volume_desc';
    case PriceChangeOption.MarketCap:
      return direction === SortDirection.Ascending
        ? 'market_cap_asc'
        : 'market_cap_desc';
    case PriceChangeOption.PriceChange:
    default:
      return direction === SortDirection.Ascending
        ? 'price_change_asc'
        : 'price_change_desc';
  }
};

const normalizeRwaToken = (token: RwaToken): TrendingAsset => ({
  assetId: token.assetId,
  symbol: token.symbol,
  name: token.name,
  decimals: token.decimals,
  price: token.rwaData.price,
  aggregatedUsdVolume: token.rwaData.aggregatedUsdVolume,
  marketCap: token.rwaData.marketCap,
  priceChangePct: { h24: token.rwaData.priceChange },
  rwaData: token.rwaData as unknown as TrendingAsset['rwaData'],
});

/**
 * Hook for RWA tokens using the dedicated /v1/rwas endpoint.
 * Defaults to Ethereum + BNB when no chainIds are provided.
 *
 * Server-side sorting, pagination, and search are delegated to the RWA API.
 *
 * @param opts.searchQuery - Server-side query to filter results
 * @param opts.chainIds - Chain IDs to filter by (defaults to RWA_CHAIN_IDS)
 * @param opts.sortTrendingTokensOptions - Sorting options for price change / volume / market cap
 * @returns Token data, loading state, pagination helpers, and refetch function for rwa tokens
 */
export const useRwaTokens = (opts?: {
  searchQuery?: string;
  chainIds?: CaipChainId[] | null;
  pageSize?: number;
  sortTrendingTokensOptions?: {
    option: PriceChangeOption;
    direction: SortDirection;
  };
}) => {
  const {
    searchQuery,
    chainIds,
    pageSize = RWA_PAGE_SIZE,
    sortTrendingTokensOptions,
  } = opts ?? {};
  const { option = DEFAULT_SORT_OPTION, direction = DEFAULT_SORT_DIRECTION } =
    sortTrendingTokensOptions ?? {};

  const stableChainIds = useStableArray(chainIds ?? RWA_CHAIN_IDS);

  const [data, setData] = useState<TrendingAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [totalCount, setTotalCount] = useState(0);

  const requestIdRef = useRef(0);
  const isLoadingRef = useRef(true);
  // Ref-based guard prevents duplicate loadMore calls when FlashList fires
  // onEndReached multiple times before the state update lands.
  const isLoadingMoreRef = useRef(false);

  const sortBy = buildSortBy(option, direction);

  const fetchPage = useCallback(
    (after?: string) =>
      fetchRwas({
        chainIds: stableChainIds,
        query: searchQuery,
        sortBy,
        limit: pageSize,
        after,
      }),
    [stableChainIds, searchQuery, sortBy, pageSize],
  );

  const fetchTokens = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    isLoadingRef.current = true;
    setIsLoading(true);

    // Only the awaited call stays inside `try`: React Compiler cannot lower a
    // `finally` clause, so the cleanup is duplicated across both exits instead.
    let response: Awaited<ReturnType<typeof fetchPage>> | undefined;
    try {
      response = await fetchPage();
    } catch {
      if (requestId === requestIdRef.current) {
        setData([]);
        setNextCursor(undefined);
        setHasNextPage(false);
        setTotalCount(0);
        isLoadingRef.current = false;
        setIsLoading(false);
      }
      return;
    }

    if (requestId === requestIdRef.current) {
      setData(response.data.map(normalizeRwaToken));
      setNextCursor(response.pageInfo.nextCursor || undefined);
      setHasNextPage(response.pageInfo.hasNextPage);
      setTotalCount(response.totalCount);
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (
      !hasNextPage ||
      !nextCursor ||
      isLoadingMoreRef.current ||
      isLoadingRef.current
    ) {
      return;
    }

    const requestId = requestIdRef.current;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    let response: Awaited<ReturnType<typeof fetchPage>> | undefined;
    try {
      response = await fetchPage(nextCursor);
    } catch {
      // Pagination errors are silent; existing results stay intact
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
      return;
    }

    if (requestId === requestIdRef.current) {
      const pageTokens = response.data;
      setData((prev) => [...prev, ...pageTokens.map(normalizeRwaToken)]);
      setNextCursor(response.pageInfo.nextCursor || undefined);
      setHasNextPage(response.pageInfo.hasNextPage);
      setTotalCount(response.totalCount);
    }

    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
  }, [hasNextPage, nextCursor, fetchPage]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasNextPage,
    totalCount,
    loadMore,
    refetch: fetchTokens,
  };
};
