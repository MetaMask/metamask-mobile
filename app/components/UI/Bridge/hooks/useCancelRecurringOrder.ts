import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assetIdsMatch } from '@metamask/bridge-controller';
import {
  createProjectLogger,
  isCaipAccountId,
  isCaipAssetType,
  parseCaipAccountId,
  parseCaipAssetType,
} from '@metamask/utils';
import type { InfiniteData } from '@tanstack/query-core';
import Engine from '../../../../core/Engine';
import {
  RecurringOrderState,
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

function recurringAssetIdsMatch(left: string, right: string): boolean {
  return (
    isCaipAssetType(left) &&
    isCaipAssetType(right) &&
    assetIdsMatch(left, right)
  );
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
    (params.orderStates === undefined || Array.isArray(params.orderStates)) &&
    (params.chainId === undefined || typeof params.chainId === 'string') &&
    (params.assetId === undefined || typeof params.assetId === 'string') &&
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
    state: RecurringOrderState.Cancelled,
  };
  const sourceAssetId = order.src.asset.assetId;
  const destinationAssetId = order.dest.asset.assetId;
  const sourceChainId = isCaipAssetType(sourceAssetId)
    ? parseCaipAssetType(sourceAssetId).chainId
    : undefined;
  const orderWalletAddress = isCaipAccountId(order.account)
    ? parseCaipAccountId(order.account).address
    : order.account;

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
            orders: page.orders.filter(({ id }) => id !== order.id),
          }));

          // Reinsert only into compatible History caches for this wallet and chain.
          const isHistoryQuery =
            params.orderStates === undefined ||
            params.orderStates.includes(RecurringOrderState.Cancelled);
          const isMatchingWallet =
            params.walletAddress.toLowerCase() ===
            orderWalletAddress.toLowerCase();
          const isMatchingChain =
            params.chainId === undefined || params.chainId === sourceChainId;
          const isMatchingAsset =
            params.assetId === undefined ||
            recurringAssetIdsMatch(params.assetId, sourceAssetId) ||
            recurringAssetIdsMatch(params.assetId, destinationAssetId);

          if (
            !isHistoryQuery ||
            !isMatchingWallet ||
            !isMatchingChain ||
            !isMatchingAsset
          ) {
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
                    Date.parse(right.timingData.createdAt) -
                    Date.parse(left.timingData.createdAt),
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
      if (!data?.some(({ id }) => id === order.id)) {
        return data;
      }

      return data.filter(({ id }) => id !== order.id);
    },
  );
}

export function useCancelRecurringOrder() {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, Error, RecurringOrder>({
    mutationFn: (order) =>
      Engine.controllerMessenger.call(
        'RecurringOrdersDataService:cancelRecurringOrder',
        order.id,
        order.account,
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
