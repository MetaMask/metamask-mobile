import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@metamask/react-data-query';
import { focusManager, useQueryClient } from '@tanstack/react-query';
import type { CaipChainId } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import type {
  ListRecurringOrdersResponse,
  RecurringOrderState,
} from '../api/recurringOrders.types';
import {
  RECURRING_ORDERS_PAGE_LIMIT,
  recurringOrdersQueries,
} from '../queries/recurringOrders';

interface UseRecurringOrdersParams {
  walletAddress?: string;
  orderStates: RecurringOrderState[];
  chainId?: CaipChainId;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useRecurringOrders({
  walletAddress,
  orderStates,
  chainId,
  enabled = true,
  refetchInterval,
}: UseRecurringOrdersParams) {
  const queryClient = useQueryClient();
  const descriptor = useMemo(
    () =>
      recurringOrdersQueries.getRecurringOrders({
        walletAddress: walletAddress ?? '',
        orderStates,
        chainId,
        limit: RECURRING_ORDERS_PAGE_LIMIT,
      }),
    [chainId, orderStates, walletAddress],
  );
  const isEnabled = enabled && Boolean(walletAddress);
  const query = useInfiniteQuery<ListRecurringOrdersResponse>({
    queryKey: descriptor.queryKey,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.endCursor : undefined,
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
        .invalidateQueries(
          { queryKey: descriptor.queryKey, exact: true },
          { cancelRefetch: false },
        )
        .catch(() => undefined);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [descriptor.queryKey, isEnabled, queryClient, refetchInterval]);

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
