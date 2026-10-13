import { useInfiniteQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type { CaipChainId } from '@metamask/utils';
import Engine from '../../../../core/Engine';
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
  const queryClient = useQueryClient();
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

  async function refresh() {
    await Engine.controllerMessenger.call(
      'RecurringOrdersDataService:invalidateQueries',
      { queryKey: descriptor.queryKey },
    );

    await queryClient.invalidateQueries({
      queryKey: descriptor.queryKey,
      exact: true,
    });
  }

  return {
    orders: query.data?.pages.flatMap((page) => page.orders) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    refetch: query.refetch,
    refresh,
  };
}
