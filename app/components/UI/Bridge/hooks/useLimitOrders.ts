import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@metamask/react-data-query';
import { focusManager, useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import type {
  GetLimitOrdersResponse,
  LimitOrderState,
} from '../api/limitOrders/getLimitOrders/types';
import { limitOrdersQueries } from '../queries/limitOrders';
import { LIMIT_ORDERS_PAGE_LIMIT } from '../constants/limitOrders';

interface UseLimitOrdersParams {
  walletAddress?: string;
  states: LimitOrderState[];
  chainId?: CaipChainId;
  assetId?: CaipAssetType;
  limit?: number;
  enabled?: boolean;
  /**
   * How often, in milliseconds, the orders are refetched from the API while
   * the query is enabled. Omit to not refetch on an interval.
   */
  refetchInterval?: number;
}

export function useLimitOrders({
  walletAddress,
  states,
  chainId,
  assetId,
  limit = LIMIT_ORDERS_PAGE_LIMIT,
  enabled = true,
  refetchInterval,
}: UseLimitOrdersParams) {
  const queryClient = useQueryClient();
  const { queryKey } = useMemo(
    () =>
      limitOrdersQueries.getLimitOrders({
        walletAddress: walletAddress ?? '',
        states,
        chainId,
        assetId,
        limit,
      }),
    [walletAddress, states, chainId, assetId, limit],
  );
  const isEnabled = enabled && Boolean(walletAddress);
  const query = useInfiniteQuery<GetLimitOrdersResponse>({
    queryKey,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: isEnabled,
  });

  useEffect(() => {
    if (!isEnabled || !refetchInterval) {
      return undefined;
    }

    const interval = setInterval(() => {
      if (!focusManager.isFocused()) {
        return;
      }

      queryClient
        .invalidateQueries({ queryKey, exact: true }, { cancelRefetch: false })
        .catch(() => undefined);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [isEnabled, queryClient, queryKey, refetchInterval]);

  function fetchNextPage() {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }

    query.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);
  }

  return {
    orders: query.data?.pages.flatMap((page) => page.orders) ?? [],
    // Each page reports the total as of when it was fetched, so the latest
    // page has the freshest one.
    total: query.data?.pages.at(-1)?.total,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    refetch: query.refetch,
    refresh: () =>
      queryClient.invalidateQueries({
        queryKey,
        exact: true,
      }),
  };
}
