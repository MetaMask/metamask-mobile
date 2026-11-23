import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import ReactQueryService from '../../../../../core/ReactQueryService';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { prefetchTraderFeeds } from './traderFeedQueries';

/** Fallback timeout when `requestIdleCallback` never fires. */
const FEED_PREFETCH_IDLE_TIMEOUT_MS = 1000;

interface IdleCallbackGlobals {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

/**
 * Defers a low-priority task until the JS thread is idle so it doesn't contend
 * with scrolling/taps right after the leaderboard paints. Falls back to a
 * macrotask where `requestIdleCallback` is unavailable.
 */
const scheduleIdleTask = (task: () => void): (() => void) => {
  const idleGlobals = globalThis as typeof globalThis & IdleCallbackGlobals;

  if (idleGlobals.requestIdleCallback) {
    const idleCallbackId = idleGlobals.requestIdleCallback(task, {
      timeout: FEED_PREFETCH_IDLE_TIMEOUT_MS,
    });
    return () => idleGlobals.cancelIdleCallback?.(idleCallbackId);
  }

  const timeoutId = setTimeout(task, 0);
  return () => clearTimeout(timeoutId);
};

/**
 * Prefetches Following and All feed first pages after the visible
 * leaderboard query has settled, so tapping Feed (or switching audience)
 * is cache-backed without delaying the landing list.
 */
export const usePrefetchTraderFeeds = (enabled = true): void => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const shouldPrefetch = enabled && isUnlocked;
  const shouldPrefetchRef = useRef(shouldPrefetch);
  shouldPrefetchRef.current = shouldPrefetch;

  useEffect(() => {
    if (!shouldPrefetch) {
      return undefined;
    }

    return scheduleIdleTask(() => {
      if (!shouldPrefetchRef.current) {
        return;
      }

      prefetchTraderFeeds(ReactQueryService.queryClient).catch(() => undefined);
    });
  }, [shouldPrefetch]);
};
