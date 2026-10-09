import { useInfiniteQuery } from '@metamask/react-data-query';
import type { GetRecurringSwapsResponse } from '../api/recurringOrders.types';
import {
  RECURRING_SWAPS_PAGE_LIMIT,
  recurringOrdersQueries,
} from '../queries/recurringOrders';

interface UseRecurringSwapsParams {
  orderId?: string;
  enabled?: boolean;
}

export function useRecurringSwaps({
  orderId,
  enabled = true,
}: UseRecurringSwapsParams) {
  const descriptor = recurringOrdersQueries.getRecurringSwaps(orderId ?? '', {
    limit: RECURRING_SWAPS_PAGE_LIMIT,
  });
  const query = useInfiniteQuery<GetRecurringSwapsResponse>({
    queryKey: descriptor.queryKey,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: enabled && Boolean(orderId),
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
