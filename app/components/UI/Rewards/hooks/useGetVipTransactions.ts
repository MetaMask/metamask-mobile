import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipTransactionsById } from '../../../../reducers/rewards/selectors';
import { setVipTransactions } from '../../../../reducers/rewards';
import type {
  VipTransactionDto,
  VipTransactionType,
} from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetVipTransactionsResult {
  transactions: VipTransactionDto[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  isRefreshing: boolean;
}

/**
 * Hook to fetch paginated VIP transactions for a given type.
 * First page is cached by the RewardsController; subsequent pages use cursor.
 */
export const useGetVipTransactions = (
  type: VipTransactionType,
): UseGetVipTransactionsResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const cachedTransactions = useSelector(
    selectVipTransactionsById(subscriptionId ?? undefined, type),
  );

  const [transactions, setTransactions] = useState<VipTransactionDto[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const activeRequestRef = useRef<{ cancelled: boolean } | null>(null);
  const activePaginationRef = useRef<{ cancelled: boolean } | null>(null);

  const fetchTransactions = useCallback(
    async ({
      isFirstPage,
      currentCursor = null,
      forceFresh = false,
    }: {
      isFirstPage: boolean;
      currentCursor?: string | null;
      forceFresh?: boolean;
    }): Promise<{ cancelled: boolean }> => {
      if (!isFirstPage && isLoadingRef.current) {
        return { cancelled: false };
      }
      isLoadingRef.current = true;

      let request: { cancelled: boolean } | null = null;
      if (isFirstPage) {
        if (activeRequestRef.current) {
          activeRequestRef.current.cancelled = true;
        }
        if (activePaginationRef.current) {
          activePaginationRef.current.cancelled = true;
          setIsLoadingMore(false);
        }
        request = { cancelled: false };
        activeRequestRef.current = request;
        setIsLoading(true);
        setError(null);
      } else {
        request = { cancelled: false };
        activePaginationRef.current = request;
        setIsLoadingMore(true);
      }

      try {
        if (!subscriptionId || !isVipEnabled) {
          return { cancelled: false };
        }

        const data = await Engine.controllerMessenger.call(
          'RewardsController:getVipTransactions',
          {
            subscriptionId,
            type,
            cursor: currentCursor,
            forceFresh: isFirstPage ? forceFresh : undefined,
          },
        );

        if (request?.cancelled) {
          return { cancelled: true };
        }

        if (isFirstPage) {
          setTransactions(data.results);
          dispatch(
            setVipTransactions({
              subscriptionId,
              type,
              transactions: data.results,
            }),
          );
        } else {
          setTransactions((prev) => {
            const merged = prev ? [...prev, ...data.results] : data.results;
            dispatch(
              setVipTransactions({
                subscriptionId,
                type,
                transactions: merged,
              }),
            );
            return merged;
          });
        }

        setCursor(data.cursor);
        setHasMore(data.has_more);
      } catch (err) {
        if (request?.cancelled) {
          return { cancelled: true };
        }
        setError(
          err instanceof Error ? err.message : 'Failed to fetch transactions',
        );
      } finally {
        if (!request?.cancelled) {
          isLoadingRef.current = false;
          if (isFirstPage) {
            setIsLoading(false);
          } else {
            setIsLoadingMore(false);
          }
        }
      }
      return { cancelled: false };
    },
    [subscriptionId, type, isVipEnabled, dispatch],
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && cursor) {
      fetchTransactions({ isFirstPage: false, currentCursor: cursor });
    }
  }, [isLoadingMore, hasMore, cursor, fetchTransactions]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(null);
    setHasMore(true);
    const result = await fetchTransactions({
      isFirstPage: true,
      forceFresh: true,
    });
    if (!result.cancelled) {
      setIsRefreshing(false);
    }
  }, [fetchTransactions]);

  // Hydrate from Redux cache when local state is empty
  useEffect(() => {
    if (!isLoading && transactions === null && cachedTransactions) {
      setTransactions(cachedTransactions);
    }
  }, [isLoading, transactions, cachedTransactions]);

  // Initial fetch / refetch when type or subscription changes
  useEffect(() => {
    if (!subscriptionId || !isVipEnabled) {
      return;
    }
    setTransactions(null);
    setCursor(null);
    setHasMore(true);
    fetchTransactions({ isFirstPage: true });
  }, [subscriptionId, isVipEnabled, type, fetchTransactions]);

  return {
    transactions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  };
};

export default useGetVipTransactions;
