import { useCallback, useEffect, useRef, useState } from 'react';

export interface CursorPage<T> {
  results: T[];
  cursor: string | null;
  has_more: boolean;
}

export interface UseCursorPaginatedListParams<T> {
  /** When false, no network fetch runs; non-empty cache may still display. */
  enabled: boolean;
  /**
   * Opaque key for the list identity. Changing it cancels in-flight work and
   * starts a first-page fetch (e.g. `${subscriptionId}:${type}`).
   */
  resetKey: string;
  /** First-page Redux (or other) cache. Used after failed fetches or when disabled. */
  cachedItems?: T[] | null;
  fetchPage: (args: {
    cursor: string | null;
    isFirstPage: boolean;
    forceFresh: boolean;
  }) => Promise<CursorPage<T>>;
  /**
   * Persist first-page results only. Do not call for load-more pages so the
   * cache never holds a multi-page merge that would flash then shrink on refetch.
   */
  onFirstPage?: (items: T[]) => void;
  errorMessage?: string;
}

export interface UseCursorPaginatedListResult<T> {
  items: T[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  retry: () => void;
  isRefreshing: boolean;
}

const nonEmpty = <T>(items: T[] | null | undefined): T[] | null =>
  items && items.length > 0 ? items : null;

/**
 * Cursor-paginated list with first-page-only external cache sync.
 *
 * Display states are exclusive:
 * - First-page loading (not pull-to-refresh): no rows (skeletons in the view)
 * - Pull-to-refresh: keep current rows under RefreshControl
 * - Error with cache/rows: show those rows, suppress error (PTR to recover)
 * - Error with no rows/cache: surface error
 */
export const useCursorPaginatedList = <T>({
  enabled,
  resetKey,
  cachedItems,
  fetchPage,
  onFirstPage,
  errorMessage = 'Failed to fetch',
}: UseCursorPaginatedListParams<T>): UseCursorPaginatedListResult<T> => {
  const [items, setItems] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoadingRef = useRef(false);
  const activeRequestRef = useRef<{ cancelled: boolean } | null>(null);
  const activePaginationRef = useRef<{ cancelled: boolean } | null>(null);

  const cachedRows = nonEmpty(cachedItems);

  const fetchList = useCallback(
    async ({
      isFirstPage,
      currentCursor = null,
      forceFresh = false,
      preserveItems = false,
    }: {
      isFirstPage: boolean;
      currentCursor?: string | null;
      forceFresh?: boolean;
      preserveItems?: boolean;
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
        if (!preserveItems) {
          setItems(null);
        }
        setIsLoading(true);
        setError(null);
      } else {
        request = { cancelled: false };
        activePaginationRef.current = request;
        setIsLoadingMore(true);
      }

      try {
        if (!enabled) {
          return { cancelled: false };
        }

        const data = await fetchPage({
          cursor: currentCursor,
          isFirstPage,
          forceFresh,
        });

        if (request?.cancelled) {
          return { cancelled: true };
        }

        if (isFirstPage) {
          setItems(data.results);
          onFirstPage?.(data.results);
        } else {
          setItems((prev) =>
            prev ? [...prev, ...data.results] : data.results,
          );
        }

        setCursor(data.cursor);
        setHasMore(data.has_more);
      } catch (err) {
        if (request?.cancelled) {
          return { cancelled: true };
        }
        setError(err instanceof Error ? err.message : errorMessage);
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
    [enabled, fetchPage, onFirstPage, errorMessage],
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore && cursor) {
      fetchList({ isFirstPage: false, currentCursor: cursor });
    }
  }, [isLoadingMore, isLoading, hasMore, cursor, fetchList]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(null);
    setHasMore(true);
    const result = await fetchList({
      isFirstPage: true,
      forceFresh: true,
      preserveItems: true,
    });
    if (!result.cancelled) {
      setIsRefreshing(false);
    }
  }, [fetchList]);

  // Programmatic retry — uses isLoading skeletons, not RefreshControl.
  const retry = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    await fetchList({
      isFirstPage: true,
      forceFresh: true,
      preserveItems: false,
    });
  }, [fetchList]);

  // When disabled, surface non-empty cache as local items for display.
  useEffect(() => {
    if (!enabled && items === null && cachedRows) {
      setItems(cachedRows);
    }
  }, [enabled, items, cachedRows]);

  // Initial fetch / refetch when the list identity or enablement changes.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    setItems(null);
    setCursor(null);
    setHasMore(true);
    setIsLoadingMore(false);
    fetchList({ isFirstPage: true, preserveItems: false });

    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.cancelled = true;
      }
      if (activePaginationRef.current) {
        activePaginationRef.current.cancelled = true;
      }
      isLoadingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resetKey, fetchList]);

  const isInitialLoading = isLoading && !isRefreshing;
  const fallbackRows = nonEmpty(items) ?? cachedRows;

  let displayItems: T[] | null;
  let displayError: string | null;

  if (isInitialLoading) {
    // Skeletons only — never cache/rows beside a first-page load.
    displayItems = null;
    displayError = null;
  } else if (error) {
    if (fallbackRows) {
      // Cache/rows win; caller can pull-to-refresh. Keep failure invisible.
      displayItems = fallbackRows;
      displayError = null;
    } else {
      displayItems = null;
      displayError = error;
    }
  } else if (items !== null) {
    displayItems = items;
    displayError = null;
  } else {
    displayItems = cachedRows;
    displayError = null;
  }

  return {
    items: displayItems,
    isLoading: isInitialLoading,
    isLoadingMore,
    hasMore,
    error: displayError,
    loadMore,
    refresh,
    retry,
    isRefreshing,
  };
};

export default useCursorPaginatedList;
