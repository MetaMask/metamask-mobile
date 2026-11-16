import { useCallback } from 'react';
import {
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';

/**
 * The slice of an infinite query these lists use to page forward.
 * A failed next page keeps the loaded pages and is retried on purpose.
 */
export interface SocialListPagingQuery {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  error: unknown;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

export interface SocialListPaging {
  isFetchingNextPage: boolean;
  /** False after any error, so reaching the list end does not retry in a loop. */
  hasNextPage: boolean;
  loadMore: () => void;
  /** Retries the failed next page. No-op for any other failure. */
  retryLoadMore: () => void;
  isLoadMoreError: boolean;
  /** Query error, or `null` when the failure is only the next page. */
  surfacedError: unknown;
  /** Drops pages after the first, then refetches that page. */
  refreshFirstPage: () => Promise<void>;
}

/**
 * Shared paging for Social lists.
 *
 * `loadMore` stops after a failure because the footer is still on screen and
 * another automatic fetch would loop. `retryLoadMore` is the button.
 */
export const useSocialListPaging = <TPage>(
  query: SocialListPagingQuery,
  queryKey: QueryKey,
  enabled = true,
): SocialListPaging => {
  const queryClient = useQueryClient();
  const {
    hasNextPage,
    isFetchingNextPage,
    isError,
    isFetchNextPageError,
    error,
    fetchNextPage,
    refetch,
  } = query;

  const loadMore = useCallback(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage || isError) {
      return;
    }
    fetchNextPage().catch(() => undefined);
  }, [enabled, fetchNextPage, hasNextPage, isError, isFetchingNextPage]);

  const retryLoadMore = useCallback(() => {
    if (
      !enabled ||
      !isFetchNextPageError ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return;
    }
    fetchNextPage().catch(() => undefined);
  }, [
    enabled,
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
  ]);

  const refreshFirstPage = useCallback(async () => {
    queryClient.setQueryData<InfiniteData<TPage>>(queryKey, (old) =>
      old
        ? {
            pages: old.pages.slice(0, 1),
            pageParams: old.pageParams.slice(0, 1),
          }
        : old,
    );
    await refetch();
  }, [queryClient, queryKey, refetch]);

  return {
    isFetchingNextPage: enabled && isFetchingNextPage,
    hasNextPage: enabled && hasNextPage === true && !isError,
    loadMore,
    retryLoadMore,
    isLoadMoreError: enabled && isFetchNextPageError,
    surfacedError: enabled && !isFetchNextPageError ? error : null,
    refreshFirstPage,
  };
};
