import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  RewardsMoneyAuthorizationError,
  RewardsMoneyHttpError,
} from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';
import { useOneShotBusyRefetch } from './useOneShotBusyRefetch';

/**
 * How many times a failed later page is asked for again. The scroll that
 * opened the page is not one of these. Four waits (2s, 4s, 8s, 16s) stay
 * well under the earnings read budget of 60 requests per 30 seconds.
 */
const LATER_PAGE_RETRY_LIMIT = 4;
const LATER_PAGE_RETRY_BASE_MS = 2_000;
const LATER_PAGE_RETRY_MAX_MS = 30_000;

/** 0..1000 inclusive. Jitter only, not a secret. */
function retryJitterMs(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] % 1001;
}

/**
 * Wait before asking for a failed later page again. `null` means this error
 * will not succeed by asking again: a client refusal other than `429`, an
 * authorization failure, or the retry limit. A `Retry-After` is the wait.
 * Anything else backs off from 2 seconds and never sooner than that.
 */
function laterPageRetryDelayMs(error: unknown, attempt: number): number | null {
  if (attempt > LATER_PAGE_RETRY_LIMIT) {
    return null;
  }
  if (error instanceof RewardsMoneyAuthorizationError) {
    return null;
  }
  if (error instanceof RewardsMoneyHttpError) {
    const retryable =
      error.status === 408 ||
      error.status === 429 ||
      error.status === 503 ||
      error.status >= 500;
    if (!retryable) {
      return null;
    }
    if (error.retryAfterSeconds !== undefined) {
      return error.retryAfterSeconds * 1000 + retryJitterMs();
    }
  }
  const backoff = Math.min(
    LATER_PAGE_RETRY_BASE_MS * 2 ** (attempt - 1),
    LATER_PAGE_RETRY_MAX_MS,
  );
  return backoff + retryJitterMs();
}

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
  /** Sentry `feature` tag for a read this list cannot recover. */
  feature: string;
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
 * - First-page loading with cache: show cached rows with no loading state,
 * and swap in the fresh page when it lands
 * - First-page loading without cache: no rows (skeletons in the view)
 * - Pull-to-refresh: keep current rows under RefreshControl
 * - Error with cache/rows: keep those rows and still report the error
 * - Error with no rows/cache: surface error and no rows
 * - A failed later page is not asked for again from the list end. It retries
 * on its own timer, honors `Retry-After`, and stops on a client refusal or
 * after {@link LATER_PAGE_RETRY_LIMIT} attempts. Blur cancels a wait that
 * is already running. A retryable failure that lands while blurred is
 * remembered too, and counts as one attempt, so the next focus asks once.
 * The failure that stops the retries is the one that is reported.
 */
export const useCursorPaginatedList = <T>({
  enabled,
  resetKey,
  cachedItems,
  fetchPage,
  onFirstPage,
  errorMessage = 'Failed to fetch',
  feature,
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
  const {
    cancel: cancelBusyRefetch,
    arm: armBusyRefetch,
    isFocused,
  } = useOneShotBusyRefetch();
  const pageRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRetryAttemptRef = useRef(0);
  // Set only while a later-page retry is waiting. Blur clears the timer and
  // leaves this, so the next focus can ask once without a second timer.
  const pendingPageRetryRef = useRef<{ cursor: string | null } | null>(null);
  const cancelPageRetry = useCallback(() => {
    if (pageRetryTimerRef.current !== null) {
      clearTimeout(pageRetryTimerRef.current);
      pageRetryTimerRef.current = null;
    }
  }, []);

  const cachedRows = nonEmpty(cachedItems);

  // Declared before fetchList: the busy refetch calls the latest fetch, and
  // that call sits inside the callback that creates it.
  const fetchListRef = useRef<
    (args: {
      isFirstPage: boolean;
      currentCursor?: string | null;
      forceFresh?: boolean;
      preserveItems?: boolean;
      followUp?: boolean;
      pageRetry?: boolean;
    }) => Promise<{ cancelled: boolean }>
  >(() => Promise.resolve({ cancelled: false }));

  const fetchList = useCallback(
    async ({
      isFirstPage,
      currentCursor = null,
      forceFresh = false,
      preserveItems = false,
      followUp = false,
      pageRetry = false,
    }: {
      isFirstPage: boolean;
      currentCursor?: string | null;
      forceFresh?: boolean;
      preserveItems?: boolean;
      followUp?: boolean;
      pageRetry?: boolean;
    }): Promise<{ cancelled: boolean }> => {
      if (!isFirstPage && isLoadingRef.current) {
        return { cancelled: false };
      }
      cancelBusyRefetch();
      cancelPageRetry();
      if (!pageRetry) {
        pageRetryAttemptRef.current = 0;
        pendingPageRetryRef.current = null;
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
        setError(null);
        pendingPageRetryRef.current = null;
        pageRetryAttemptRef.current = 0;
      } catch (err) {
        if (request?.cancelled) {
          return { cancelled: true };
        }
        setError(err instanceof Error ? err.message : errorMessage);
        // The list end must not start this page again: that fires as soon as
        // the footer spinner unmounts and would cancel the wait below.
        const retryDelayMs = isFirstPage
          ? null
          : laterPageRetryDelayMs(err, pageRetryAttemptRef.current + 1);
        if (retryDelayMs !== null && !isFocused()) {
          // Count the ask the next focus will make, so leaving and returning
          // cannot add a retry past the limit. Nothing is reported yet.
          pageRetryAttemptRef.current += 1;
          pendingPageRetryRef.current = { cursor: currentCursor };
        } else if (retryDelayMs !== null) {
          pageRetryAttemptRef.current += 1;
          pendingPageRetryRef.current = { cursor: currentCursor };
          pageRetryTimerRef.current = setTimeout(() => {
            pageRetryTimerRef.current = null;
            void fetchListRef.current({
              isFirstPage: false,
              currentCursor,
              followUp: true,
              pageRetry: true,
            });
          }, retryDelayMs);
        } else {
          if (!isFirstPage) {
            pageRetryAttemptRef.current = 0;
            pendingPageRetryRef.current = null;
          }
          reportRewardsMoneyReadFailure(
            err,
            'cursorPaginatedList.fetch_failed',
            !isFirstPage || followUp,
            feature,
          );
          if (isFirstPage && !followUp) {
            armBusyRefetch(err, () => {
              void fetchListRef.current({
                isFirstPage,
                currentCursor,
                forceFresh: true,
                preserveItems,
                followUp: true,
              });
            });
          }
        }
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
    [
      armBusyRefetch,
      cancelBusyRefetch,
      cancelPageRetry,
      enabled,
      fetchPage,
      onFirstPage,
      errorMessage,
      feature,
      isFocused,
    ],
  );
  fetchListRef.current = fetchList;

  // Blur drops the wait. Coming back asks for the same cursor once; the
  // in-flight guard drops that ask when a retry is already running.
  useFocusEffect(
    useCallback(() => {
      const pending = pendingPageRetryRef.current;
      if (pending && pageRetryTimerRef.current === null) {
        void fetchListRef.current({
          isFirstPage: false,
          currentCursor: pending.cursor,
          followUp: true,
          pageRetry: true,
        });
      }
      return () => {
        cancelPageRetry();
      };
    }, [cancelPageRetry]),
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && !error && hasMore && cursor) {
      void fetchList({ isFirstPage: false, currentCursor: cursor });
    }
  }, [isLoadingMore, isLoading, error, hasMore, cursor, fetchList]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(null);
    setHasMore(true);
    try {
      await fetchList({
        isFirstPage: true,
        forceFresh: true,
        preserveItems: true,
      });
    } finally {
      // Always clear — including when resetKey/enabled cancels the request.
      setIsRefreshing(false);
    }
  }, [fetchList]);

  // A failed next page keeps its cursor. Retry asks for that page again and
  // leaves the rows already shown. Anything else, including a failed first
  // page, starts over.
  const retry = useCallback(async () => {
    if (error && cursor && nonEmpty(items)) {
      await fetchList({ isFirstPage: false, currentCursor: cursor });
      return;
    }
    setCursor(null);
    setHasMore(true);
    await fetchList({
      isFirstPage: true,
      forceFresh: true,
      preserveItems: false,
    });
  }, [cursor, error, fetchList, items]);

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
    setIsRefreshing(false);
    void fetchList({ isFirstPage: true, preserveItems: false });

    return () => {
      cancelBusyRefetch();
      cancelPageRetry();
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

  if (!isInitialLoading && error) {
    displayItems = fallbackRows;
    displayError = error;
  } else if (!isInitialLoading && items !== null) {
    displayItems = items;
    displayError = null;
  } else {
    // Cached rows stay up while the first page loads, and again when loading
    // finishes with nothing stored. Skeletons only when there is no cache.
    displayItems = cachedRows;
    displayError = null;
  }

  return {
    items: displayItems,
    isLoading: isInitialLoading && displayItems === null,
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
