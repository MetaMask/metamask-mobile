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
  retry: () => void;
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
    if (!isLoadingMore && !isLoading && hasMore && cursor) {
      fetchTransactions({ isFirstPage: false, currentCursor: cursor });
    }
  }, [isLoadingMore, isLoading, hasMore, cursor, fetchTransactions]);

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

  // Programmatic retry (e.g. error banner) — uses isLoading skeletons, not
  // RefreshControl's refreshing spinner, to avoid shifting the whole screen.
  const retry = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    await fetchTransactions({
      isFirstPage: true,
      forceFresh: true,
    });
  }, [fetchTransactions]);

  // Hydrate from Redux cache when local state is empty. Only hydrate non-empty
  // caches — an empty [] from a prior fetch should not suppress the loading
  // skeleton on the next visit while a refetch is in flight.
  useEffect(() => {
    if (
      !isLoading &&
      transactions === null &&
      cachedTransactions &&
      cachedTransactions.length > 0
    ) {
      setTransactions(cachedTransactions);
    }
  }, [isLoading, transactions, cachedTransactions]);

  // Initial fetch / refetch when type or subscription changes
  useEffect(() => {
    if (!subscriptionId || !isVipEnabled) {
      return;
    }

    const hasCachedRows =
      Array.isArray(cachedTransactions) && cachedTransactions.length > 0;

    // Keep non-empty cached rows visible while refetching. Seed null (not [])
    // when there is no cache or only an empty cache so the empty message does
    // not flash beside loading indicators.
    setTransactions(hasCachedRows ? cachedTransactions : null);
    setCursor(null);
    setHasMore(true);
    setIsLoadingMore(false);
    fetchTransactions({ isFirstPage: true });

    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.cancelled = true;
      }
      if (activePaginationRef.current) {
        activePaginationRef.current.cancelled = true;
      }
      isLoadingRef.current = false;
    };
    // Intentionally omit cachedTransactions from deps — we only seed from
    // cache when the fetch key (subscription/type) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId, isVipEnabled, type, fetchTransactions]);

  // Prefer live local state, but fall back to a non-empty Redux cache so real
  // rows never disappear during refetch. Empty [] cache is ignored so loading
  // can show skeletons instead of a premature empty message.
  const cachedRows =
    cachedTransactions && cachedTransactions.length > 0
      ? cachedTransactions
      : null;
  const displayedTransactions = transactions ?? cachedRows;

  return {
    transactions: displayedTransactions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    retry,
    isRefreshing,
  };
};

export default useGetVipTransactions;
