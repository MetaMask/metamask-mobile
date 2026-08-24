import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import {
  selectCardActiveProviderId,
  selectCardProviderUserId,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import type {
  CardTransaction,
  CardTransactionPage,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { cardQueries } from '../queries';

const PAGE_LIMIT = 20;

export interface UseCardTransactionsOptions {
  /** Epoch ms. Must be paired with `toDate` (the API rejects a lone bound). */
  fromDate?: number;
  /** Epoch ms. Must be paired with `fromDate`. */
  toDate?: number;
}

export interface UseCardTransactionsResult {
  /** Flattened transactions across all fetched pages, newest first. */
  items: CardTransaction[];
  /** True while more pages remain to be fetched. */
  hasMore: boolean;
  /** Fetch the next page; no-op if a fetch is in flight or none remain. */
  loadMore: () => void;
  /** True while a follow-up (non-initial) page is being fetched. */
  isLoadingMore: boolean;
  /** True while the first page is being fetched. */
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
  isFetching: boolean;
}

/**
 * Paginated card transaction history from the active card provider,
 * via `CardController.listTransactions`. Includes merchant details, statuses
 * (including declined transactions), and on-chain settlement hashes in
 * `fundingSources[].txHash` for enriching Accounts API activity.
 *
 * Requires an authenticated card session; the query surfaces the
 * controller's auth error via `error` otherwise.
 */
export function useCardTransactions(
  options: UseCardTransactionsOptions = {},
): UseCardTransactionsResult {
  const { fromDate, toDate } = options;
  const queryClient = useQueryClient();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const providerId = useSelector(selectCardActiveProviderId);
  const providerUserId = useSelector(selectCardProviderUserId);
  // Existing production Card auth tokens predate providerUserId. Keep those
  // users isolated by provider until their next login stores the stable ID.
  const transactionCacheUserId = providerUserId ?? 'legacy';

  const cardController = Engine.context?.CardController;

  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.removeQueries({
        queryKey: cardQueries.transactions.keys.all(),
      });
    }
  }, [isAuthenticated, queryClient]);

  const query = useInfiniteQuery({
    queryKey: cardQueries.transactions.keys.list(
      providerId,
      transactionCacheUserId,
      fromDate,
      toDate,
    ),
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!cardController) {
        throw new Error('CardController not available');
      }
      return cardController.listTransactions({
        limit: PAGE_LIMIT,
        cursor: pageParam,
        fromDate,
        toDate,
      });
    },
    getNextPageParam: (lastPage: CardTransactionPage) => lastPage.nextCursor,
    enabled: Boolean(cardController && isAuthenticated && providerId),
  });

  const items = useMemo(
    () =>
      isAuthenticated
        ? (query.data?.pages.flatMap((page) => page.items) ?? [])
        : [],
    [isAuthenticated, query.data],
  );

  const hasMore =
    isAuthenticated &&
    Boolean(query.data?.pages[query.data.pages.length - 1]?.nextCursor);

  const { isFetchingNextPage, fetchNextPage } = query;
  const loadMore = useCallback(() => {
    if (hasMore && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  return {
    items,
    hasMore,
    loadMore,
    isLoadingMore: query.isFetchingNextPage,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the spinner.
    isLoading: query.isInitialLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
