import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import Engine from '../../../../core/Engine';
import type { CardTransactionPage } from '../../../../core/Engine/controllers/card-controller/provider-types';

const CARD_TRANSACTIONS_QUERY_KEY = 'cardTransactions';
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_LIMIT = 20;

export function useCardTransactions(options?: { searchQuery?: string }) {
  const [debouncedSearch, setDebouncedSearch] = useState(
    options?.searchQuery ?? '',
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(options?.searchQuery ?? '');
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [options?.searchQuery]);

  const cardController = Engine.context?.CardController;

  const query = useInfiniteQuery({
    queryKey: [CARD_TRANSACTIONS_QUERY_KEY, debouncedSearch],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!cardController) {
        throw new Error('CardController not available');
      }
      return cardController.listTransactions({
        limit: PAGE_LIMIT,
        cursor: pageParam,
        searchQuery: debouncedSearch || undefined,
      });
    },
    getNextPageParam: (lastPage: CardTransactionPage) => lastPage.nextCursor,
    enabled: Boolean(cardController),
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const hasMore = Boolean(
    query.data?.pages[query.data.pages.length - 1]?.nextCursor,
  );

  const loadMore = () => {
    if (hasMore && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  };

  return {
    items,
    hasMore,
    loadMore,
    isLoadingMore: query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
