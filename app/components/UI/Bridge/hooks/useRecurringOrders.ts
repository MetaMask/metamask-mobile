import { useInfiniteQuery } from '@metamask/react-data-query';
import type { CaipChainId } from '@metamask/utils';
import type {
  GetRecurringOrdersResponse,
  RecurringOrderStatus,
} from '../api/recurringOrders.types';
import {
  RECURRING_ORDERS_PAGE_LIMIT,
  recurringOrdersQueries,
} from '../queries/recurringOrders';

interface UseRecurringOrdersParams {
  walletAddress?: string;
  status: RecurringOrderStatus[];
  chainId?: CaipChainId;
  enabled?: boolean;
}

export function useRecurringOrders({
  walletAddress,
  status,
  chainId,
  enabled = true,
}: UseRecurringOrdersParams) {
  const descriptor = recurringOrdersQueries.getRecurringOrders({
    walletAddress: walletAddress ?? '',
    status,
    chainId,
    limit: RECURRING_ORDERS_PAGE_LIMIT,
  });
  const query = useInfiniteQuery<GetRecurringOrdersResponse>({
    queryKey: descriptor.queryKey,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: enabled && Boolean(walletAddress),
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
  };
}
