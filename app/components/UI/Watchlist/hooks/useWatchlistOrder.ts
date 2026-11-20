import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import type { UnifiedWatchlistItem } from '../types';
import { reconcileWatchlistOrder } from '../utils';
import {
  readWatchlistOrder,
  writeWatchlistOrder,
} from '../watchlistOrderStorage';

const WATCHLIST_ORDER_QUERY_KEY = 'watchlist-order';
export const WATCHLIST_ORDER_READ_RETRY_COUNT = 2;
const orderWriteQueues = new Map<string, Promise<void>>();

const enqueueOrderWrite = (
  accountGroupId: string | null,
  write: () => Promise<void>,
): Promise<void> => {
  const queueKey = accountGroupId ?? 'default';
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
}

interface UseWatchlistOrderOptions {
  enabled: boolean;
  isReady: boolean;
}

const areOrdersEqual = (
  left: readonly string[] | undefined,
  right: readonly string[],
): boolean =>
  left !== undefined &&
  left.length === right.length &&
  left.every((key, index) => key === right[index]);

export const useWatchlistOrder = (
  availableItems: readonly UnifiedWatchlistItem[],
  { enabled, isReady }: UseWatchlistOrderOptions,
): UseWatchlistOrderResult => {
  const accountGroupId = useSelector(selectSelectedAccountGroupId);
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => [WATCHLIST_ORDER_QUERY_KEY, accountGroupId ?? 'default'],
    [accountGroupId],
  );
  const orderQuery = useQuery({
    queryKey,
    queryFn: () => readWatchlistOrder(accountGroupId),
    enabled,
    staleTime: Infinity,
    retry: WATCHLIST_ORDER_READ_RETRY_COUNT,
    retryDelay: 0,
  });
  const canPersistOrder = enabled && isReady && orderQuery.isSuccess;
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
      const previousOrder = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData(queryKey, nextOrder);
      try {
        await enqueueOrderWrite(accountGroupId, () =>
          writeWatchlistOrder(accountGroupId, nextOrder),
        );
      } catch (error) {
        const currentOrder = queryClient.getQueryData<string[]>(queryKey);
        if (areOrdersEqual(currentOrder, nextOrder)) {
          if (previousOrder === undefined) {
            queryClient.removeQueries({ queryKey });
          } else {
            queryClient.setQueryData(queryKey, previousOrder);
          }
        }
        throw error;
      }
    },
    [accountGroupId, canPersistOrder, queryClient, queryKey],
  );

  const orderedKeys = useMemo(() => {
    if (!enabled || orderQuery.data === undefined) {
      return availableItems.map((item) => item.key);
    }
    return reconcileWatchlistOrder(orderQuery.data, availableItems);
  }, [availableItems, enabled, orderQuery.data]);
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
  };
};
