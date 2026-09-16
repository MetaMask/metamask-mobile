import { useInfiniteQuery } from '@tanstack/react-query';
import type { CaipChainId } from '@metamask/utils';
import { getRecurringOrders } from '../api/recurringOrders';
import type { RecurringOrderStatus } from '../api/recurringOrders.types';
import { recurringOrdersKeys } from '../queries/recurringOrders';

const RECURRING_ORDERS_PAGE_LIMIT = 20;

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
  const query = useInfiniteQuery({
    queryKey: recurringOrdersKeys.list({
      walletAddress: walletAddress ?? '',
      status,
      chainId,
    }),
    queryFn: ({ pageParam }) =>
      getRecurringOrders({
        walletAddress: walletAddress ?? '',
        status,
        chainId,
        limit: RECURRING_ORDERS_PAGE_LIMIT,
        cursor: pageParam,
      }),
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
