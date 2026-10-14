import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseCaipAssetType, createProjectLogger } from '@metamask/utils';
import type { InfiniteData } from '@tanstack/query-core';
import Engine from '../../../../core/Engine';
import {
  RecurringOrderStatus,
  type GetRecurringOrdersByAssetResponse,
  type GetRecurringOrdersResponse,
  type RecurringOrder,
} from '../api/recurringOrders.types';
import {
  RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
  RECURRING_ORDERS_QUERY_KEY,
  type RecurringOrdersQueryKey,
} from '../queries/recurringOrders';

const log = createProjectLogger('bridge-recurring-cancellation-history');
const RECURRING_ORDER_QUERY_INVALIDATIONS = [
  {
    queryKey: RECURRING_ORDERS_QUERY_KEY,
    refetchType: 'none',
  },
  {
    queryKey: RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
    refetchType: 'active',
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRecurringOrdersQueryKey(
  queryKey: readonly unknown[],
): queryKey is RecurringOrdersQueryKey {
  if (
    queryKey.length !== 2 ||
    queryKey[0] !== RECURRING_ORDERS_QUERY_KEY ||
    !isRecord(queryKey[1])
  ) {
    return false;
  }

  const params = queryKey[1];
  return (
    typeof params.walletAddress === 'string' &&
    (params.status === undefined || Array.isArray(params.status)) &&
    (params.chainId === undefined || typeof params.chainId === 'string') &&
    (params.limit === undefined || typeof params.limit === 'number')
  );
}

/**
 * Moves a successfully cancelled order from Open Orders to matching History
 * caches.
 *
 * This is a post-success UI cache update, not an optimistic update. The order
 * is removed from every loaded recurring-order query and reinserted as
 * cancelled into matching History queries. It is also removed from the
 * open-only asset query. Subsequent invalidation marks the UI and service
 * caches stale so a future fetch can reconcile with the backend.
 */
function updateRecurringOrdersCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  order: RecurringOrder,
): void {
  const cancelledOrder = {
    ...order,
    status: RecurringOrderStatus.Cancelled,
  };
  const sourceChainId = parseCaipAssetType(order.src.asset.assetId).chainId;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: [RECURRING_ORDERS_QUERY_KEY] })
    .forEach((query) => {
      if (!isRecurringOrdersQueryKey(query.queryKey)) {
        return;
      }

      const params = query.queryKey[1];
      queryClient.setQueryData<InfiniteData<GetRecurringOrdersResponse>>(
        query.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          // Remove stale copies from every loaded page, including Open Orders.
          const pages = data.pages.map((page) => ({
            ...page,
            orders: page.orders.filter(
              ({ orderId }) => orderId !== order.orderId,
            ),
          }));

          // Reinsert only into compatible History caches for this wallet and chain.
          const isHistoryQuery =
            params.status === undefined ||
            params.status.includes(RecurringOrderStatus.Cancelled);
          const isMatchingWallet =
            params.walletAddress.toLowerCase() ===
            order.src.walletAddress.toLowerCase();
          const isMatchingChain =
            params.chainId === undefined || params.chainId === sourceChainId;

          if (!isHistoryQuery || !isMatchingWallet || !isMatchingChain) {
            return { ...data, pages };
          }

          const [firstPage, ...remainingPages] = pages;
          if (!firstPage) {
            return { ...data, pages };
          }

          return {
            ...data,
            pages: [
              {
                ...firstPage,
                orders: [...firstPage.orders, cancelledOrder].sort(
                  (left, right) =>
                    Date.parse(right.createdAt) - Date.parse(left.createdAt),
                ),
              },
              ...remainingPages,
            ],
          };
        },
      );
    });

  queryClient.setQueriesData<GetRecurringOrdersByAssetResponse>(
    { queryKey: [RECURRING_ORDERS_BY_ASSET_QUERY_KEY] },
    (data) => {
      if (!data?.some(({ orderId }) => orderId === order.orderId)) {
        return data;
      }

      return data.filter(({ orderId }) => orderId !== order.orderId);
    },
  );
}

export function useCancelRecurringOrder() {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, Error, RecurringOrder>({
    mutationFn: (order) =>
      Engine.controllerMessenger.call(
        'RecurringOrdersDataService:cancelRecurringOrder',
        order.orderId,
      ),
    onSuccess: async (_data, order) => {
      updateRecurringOrdersCaches(queryClient, order);

      await Promise.all(
        RECURRING_ORDER_QUERY_INVALIDATIONS.map(async ({ queryKey }) => {
          try {
            await Engine.controllerMessenger.call(
              'RecurringOrdersDataService:invalidateQueries',
              { queryKey: [queryKey] },
            );
          } catch (error) {
            log('Recurring-order service cache invalidation failed', error);
          }
        }),
      );

      await Promise.all(
        RECURRING_ORDER_QUERY_INVALIDATIONS.map(
          async ({ queryKey, refetchType }) => {
            try {
              await queryClient.invalidateQueries({
                queryKey: [queryKey],
                refetchType,
              });
            } catch (error) {
              log('Recurring-order UI cache invalidation failed', error);
            }
          },
        ),
      );
    },
  });

  return {
    cancelRecurringOrder: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
