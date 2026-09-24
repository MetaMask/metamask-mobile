import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import useInterval from '../../../../hooks/useInterval';

/** How often visible feed rows re-read the wall clock for relative ages. */
export const FEED_NOW_TICK_MS = 30_000;

const isForegroundAppState = (appState: AppStateStatus): boolean =>
  appState !== 'background' && appState !== 'inactive';

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

interface ClockSnap {
  isTicking: boolean;
  dataUpdatedAt: number | undefined;
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
 * Snaps `now` during render when ticking starts or `dataUpdatedAt` changes so
 * the first painted frame is already current (the pager keeps this hook
 * mounted while the Leaderboard tab is showing).
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
  const isTicking = enabled && isForegroundAppState(appState);
  const [lastSnap, setLastSnap] = useState<ClockSnap>(() => ({
    isTicking,
    dataUpdatedAt,
  }));

  // Adjust during render so tab-switch / resume / refetch does not paint one
  // frame of ages measured from the frozen mount-time clock.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (
    isTicking !== lastSnap.isTicking ||
    (isTicking && dataUpdatedAt !== lastSnap.dataUpdatedAt)
  ) {
    setLastSnap({ isTicking, dataUpdatedAt });
    if (isTicking) {
      setNow(Date.now());
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useInterval(
    () => {
      setNow(Date.now());
    },
    { delay: isTicking ? FEED_NOW_TICK_MS : null },
  );

  return now;
};
