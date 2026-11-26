import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import type { UnifiedWatchlistItem } from '../types';
import { reconcileWatchlistItemOrder } from '../utils';
import {
  readWatchlistOrder,
  writeWatchlistOrder,
} from '../watchlistOrderStorage';

const WATCHLIST_ORDER_QUERY_KEY = 'watchlist-order';
export const WATCHLIST_ORDER_READ_RETRY_COUNT = 2;
const orderWriteQueues = new Map<string, Promise<void>>();
const lastPersistedOrders = new Map<string, string[]>();

const getOrderQueueKey = (accountGroupId: string | null): string =>
  accountGroupId ?? 'default';

const enqueueOrderWrite = async (
  accountGroupId: string | null,
  write: () => Promise<void>,
): Promise<void> => {
  const queueKey = getOrderQueueKey(accountGroupId);
  const previousWrite = orderWriteQueues.get(queueKey) ?? Promise.resolve();
  const currentWrite = previousWrite
    .catch(() => undefined)
    .then(write)
    .finally(() => {
      if (orderWriteQueues.get(queueKey) === currentWrite) {
        orderWriteQueues.delete(queueKey);
      }
    });
  orderWriteQueues.set(queueKey, currentWrite);

  return currentWrite;
};

interface UseWatchlistOrderResult {
  orderedItems: UnifiedWatchlistItem[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  retry: () => Promise<void>;
  persistOrder: (keys: string[]) => Promise<void>;
  appendOrderKey: (key: string) => Promise<void>;
}

interface UseWatchlistOrderOptions {
  enabled: boolean;
  /**
   * Authoritative set of currently watchlisted item keys (including items whose
   * metadata has not hydrated yet). When provided, keys outside this set are
   * pruned from persisted order so re-adding a removed item always places it at
   * the bottom instead of flashing in its old slot.
   */
  memberKeys?: ReadonlySet<string>;
}

const areOrdersEqual = (
  left: readonly string[] | undefined,
  right: readonly string[],
): boolean =>
  left?.length === right.length &&
  left.every((key, index) => key === right[index]);

export const useWatchlistOrder = (
  availableItems: readonly UnifiedWatchlistItem[],
  { enabled, memberKeys }: UseWatchlistOrderOptions,
): UseWatchlistOrderResult => {
  const accountGroupId = useSelector(selectSelectedAccountGroupId);
  const queueKey = getOrderQueueKey(accountGroupId);
  const [fallbackOrder, setFallbackOrder] = useState<{
    queueKey: string;
    keys: string[];
  }>({ queueKey, keys: [] });
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => [WATCHLIST_ORDER_QUERY_KEY, accountGroupId ?? 'default'],
    [accountGroupId],
  );
  const orderQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const order = await readWatchlistOrder(accountGroupId);
      if (!orderWriteQueues.has(queueKey)) {
        lastPersistedOrders.set(queueKey, order);
      }
      return order;
    },
    enabled,
    staleTime: Infinity,
    retry: WATCHLIST_ORDER_READ_RETRY_COUNT,
    retryDelay: 0,
  });
  const canPersistOrder = enabled && orderQuery.isSuccess;
  const refetchOrder = orderQuery.refetch;
  const retry = useCallback(async () => {
    await refetchOrder();
  }, [refetchOrder]);

  const persistOrder = useCallback(
    async (keys: string[]) => {
      if (!canPersistOrder) {
        throw new Error('Watchlist order is not ready to persist');
      }

      const nextOrder = Array.from(new Set(keys));
      const availableKeys = new Set(availableItems.map((item) => item.key));
      const preservedHydrationKeys = (orderQuery.data ?? []).filter(
        (key) =>
          !availableKeys.has(key) &&
          !nextOrder.includes(key) &&
          (memberKeys === undefined || memberKeys.has(key)),
      );
      const orderToPersist = [...nextOrder, ...preservedHydrationKeys];
      queryClient.setQueryData(queryKey, orderToPersist);
      try {
        await enqueueOrderWrite(accountGroupId, async () =>
          writeWatchlistOrder(accountGroupId, orderToPersist),
        );
        lastPersistedOrders.set(queueKey, orderToPersist);
      } catch (error) {
        const currentOrder = queryClient.getQueryData<string[]>(queryKey);
        if (areOrdersEqual(currentOrder, orderToPersist)) {
          const persistedOrder = lastPersistedOrders.get(queueKey);
          if (persistedOrder === undefined) {
            queryClient.removeQueries({ queryKey });
          } else {
            queryClient.setQueryData(queryKey, persistedOrder);
          }
        }
        throw error;
      }
    },
    [
      accountGroupId,
      availableItems,
      canPersistOrder,
      memberKeys,
      orderQuery.data,
      queryClient,
      queryKey,
      queueKey,
    ],
  );

  useEffect(() => {
    if (
      !canPersistOrder ||
      memberKeys === undefined ||
      orderQuery.data === undefined
    ) {
      return;
    }

    const prunedOrder = orderQuery.data.filter((key) => memberKeys.has(key));
    if (prunedOrder.length === orderQuery.data.length) {
      return;
    }

    queryClient.setQueryData(queryKey, prunedOrder);
    enqueueOrderWrite(accountGroupId, async () =>
      writeWatchlistOrder(accountGroupId, prunedOrder),
    )
      .then(() => {
        lastPersistedOrders.set(queueKey, prunedOrder);
      })
      .catch(() => undefined);
  }, [
    accountGroupId,
    canPersistOrder,
    memberKeys,
    orderQuery.data,
    queryClient,
    queryKey,
    queueKey,
  ]);
  const appendOrderKey = useCallback(
    async (key: string) => {
      const currentOrder =
        queryClient.getQueryData<string[]>(queryKey) ??
        reconcileWatchlistItemOrder(orderQuery.data ?? [], availableItems);
      await persistOrder([
        ...currentOrder.filter((currentKey) => currentKey !== key),
        key,
      ]);
    },
    [availableItems, orderQuery.data, persistOrder, queryClient, queryKey],
  );

  const isUsingFallback = !enabled || orderQuery.data === undefined;
  const fallbackKeys = useMemo(() => {
    if (!isUsingFallback) {
      return fallbackOrder.keys;
    }
    const baseKeys =
      fallbackOrder.queueKey === queueKey ? fallbackOrder.keys : [];
    return reconcileWatchlistItemOrder(baseKeys, availableItems);
  }, [
    availableItems,
    fallbackOrder.keys,
    fallbackOrder.queueKey,
    isUsingFallback,
    queueKey,
  ]);

  if (
    isUsingFallback &&
    (fallbackOrder.queueKey !== queueKey ||
      !areOrdersEqual(fallbackOrder.keys, fallbackKeys))
  ) {
    setFallbackOrder({ queueKey, keys: fallbackKeys });
  }

  const orderedKeys = useMemo(() => {
    if (isUsingFallback) {
      return fallbackKeys;
    }
    const activePersistedOrder =
      memberKeys === undefined
        ? orderQuery.data
        : orderQuery.data.filter((key) => memberKeys.has(key));
    return reconcileWatchlistItemOrder(activePersistedOrder, availableItems);
  }, [
    availableItems,
    fallbackKeys,
    isUsingFallback,
    memberKeys,
    orderQuery.data,
  ]);
  const itemsByKey = useMemo(
    () => new Map(availableItems.map((item) => [item.key, item])),
    [availableItems],
  );
  const orderedItems = useMemo(
    () =>
      orderedKeys
        .map((key) => itemsByKey.get(key))
        .filter((item): item is UnifiedWatchlistItem => item !== undefined),
    [itemsByKey, orderedKeys],
  );

  return {
    orderedItems,
    isLoading: enabled && orderQuery.isLoading,
    isReady: canPersistOrder,
    error: orderQuery.error?.message ?? null,
    retry,
    persistOrder,
    appendOrderKey,
  };
};
