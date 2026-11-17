import { useInfiniteQuery } from '@metamask/react-data-query';
import type {
  CaipAccountId,
  ListRecurringSwapsResponse,
} from '../api/recurringOrders.types';
import {
  RECURRING_SWAPS_PAGE_LIMIT,
  recurringOrdersQueries,
} from '../queries/recurringOrders';

const EMPTY_ACCOUNT_ADDRESS =
  'eip155:1:0x0000000000000000000000000000000000000000';

interface UseRecurringSwapsParams {
  orderId?: string;
  accountAddress?: CaipAccountId;
  enabled?: boolean;
}

export function useRecurringSwaps({
  orderId,
  accountAddress,
  enabled = true,
}: UseRecurringSwapsParams) {
  const descriptor = recurringOrdersQueries.getRecurringSwaps(orderId ?? '', {
    accountAddress: accountAddress ?? EMPTY_ACCOUNT_ADDRESS,
    limit: RECURRING_SWAPS_PAGE_LIMIT,
  });
  const query = useInfiniteQuery<ListRecurringSwapsResponse>({
    queryKey: descriptor.queryKey,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.endCursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: enabled && Boolean(orderId && accountAddress),
  });

  function fetchNextPage() {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }

    query.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);
  }

  return {
    swaps: query.data?.pages.flatMap((page) => page.swaps) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    refetch: query.refetch,
  };
}
