import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import useInterval from '../../../../hooks/useInterval';

/** How often visible feed rows re-read the wall clock for relative ages. */
export const FEED_NOW_TICK_MS = 30_000;

export interface UseFeedNowOptions {
  /**
   * When false, the interval is paused (Feed tab hidden). Resuming snaps
   * `now` immediately so a long pause does not wait for the next tick.
   */
  enabled: boolean;
  /**
   * Instant the loaded snapshot was fetched. A change (PTR / load more) snaps
   * `now` immediately so labels do not wait for the next interval.
   */
  dataUpdatedAt?: number;
}

/**
 * Shared wall-clock for feed relative timestamps. One list-level tick, not a
 * timer per row: `FeedItemRow` already takes `now` and is memoized inside a
 * virtualized list.
 *
 * Ticks only while `enabled` and the app is not backgrounded or inactive
 * (`unknown` still ticks — that is RN's state before the first AppState event).
 * Trade timestamps are immutable; only `now - timestamp` changes.
 *
 * @param options - Gate and optional fetch-instant snap.
 * @returns Current wall-clock milliseconds.
 */
export const useFeedNow = ({
  enabled,
  dataUpdatedAt,
}: UseFeedNowOptions): number => {
  const [appState, setAppState] = useState<AppStateStatus>(
    () => AppState.currentState,
  );
  const [now, setNow] = useState(() => Date.now());

  // RN reports `unknown` before the first AppState event (including in tests).
  // Pause only when we know the UI is not visible.
  const isTicking =
    enabled && appState !== 'background' && appState !== 'inactive';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isTicking) {
      return;
    }
    setNow(Date.now());
  }, [isTicking, dataUpdatedAt]);

  useInterval(
    () => {
      setNow(Date.now());
    },
    { delay: isTicking ? FEED_NOW_TICK_MS : null },
  );

  return now;
};
