import { useInfiniteQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type { CaipChainId } from '@metamask/utils';
import type {
  GetLimitOrdersResponse,
  LimitOrderState,
} from '../api/limitOrders/getLimitOrders/types';
import { limitOrdersQueries } from '../queries/limitOrders';
import {
  LIMIT_ORDERS_PAGE_LIMIT,
  LIMIT_ORDERS_STALE_TIME,
} from '../constants/limitOrders';

interface UseLimitOrdersParams {
  walletAddress?: string;
  states: LimitOrderState[];
  chainId?: CaipChainId;
  enabled?: boolean;
}

export function useLimitOrders({
  walletAddress,
  states,
  chainId,
  enabled = true,
}: UseLimitOrdersParams) {
  const queryClient = useQueryClient();
  const descriptor = limitOrdersQueries.getLimitOrders({
    walletAddress: walletAddress ?? '',
    states,
    chainId,
    limit: LIMIT_ORDERS_PAGE_LIMIT,
  });
  const query = useInfiniteQuery<GetLimitOrdersResponse>({
    queryKey: descriptor.queryKey,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: enabled && Boolean(walletAddress),
    refetchInterval: LIMIT_ORDERS_STALE_TIME,
  });

  function fetchNextPage() {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }

    query.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);
  }

  return {
    orders: query.data?.pages.flatMap((page) => page.orders) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    refetch: query.refetch,
    refresh: () =>
      queryClient.invalidateQueries({
        queryKey: descriptor.queryKey,
        exact: true,
      }),
  };
}
