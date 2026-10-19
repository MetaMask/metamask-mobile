import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import useInterval from '../../../hooks/useInterval';

/** How often the security provenance line re-reads the wall clock. */
export const ELAPSED_MINUTES_TICK_MS = 30_000;

const MS_PER_MINUTE = 60_000;

const isForegroundAppState = (appState: AppStateStatus): boolean =>
  appState !== 'background' && appState !== 'inactive';

export interface UseElapsedMinutesOptions {
  /**
   * Instant being measured from, typically a query's `dataUpdatedAt`. `0` or
   * `undefined` means nothing has been fetched yet, which is the only case
   * that yields `null`.
   */
  since: number | undefined;
  /**
   * When false the interval is paused. Resuming snaps the clock immediately so
   * a long pause does not show a stale figure until the next tick.
   */
  enabled: boolean;
}

interface ClockSnap {
  isTicking: boolean;
  since: number | undefined;
}

/**
 * Whole minutes elapsed since `since`, or `null` when nothing was fetched.
 *
 * Single-value counterpart to `useFeedNow`: that hook hands a shared clock to
 * many virtualized rows, whereas this feeds one line of text, so it returns the
 * figure rather than the raw clock.
 *
 * Sub-minute ages come back as `0` rather than being folded into `null`, so a
 * caller can word "just now" differently from "not fetched" — the two mean
 * opposite things and only one of them has an answer to give.
 *
 * Ticks only while `enabled` and the app is not backgrounded or inactive
 * (`unknown` still ticks, which is RN's state before the first AppState event).
 *
 * @param options - Instant to measure from, and the gate.
 * @returns Whole minutes elapsed, or `null` when `since` is unset.
 */
export const useElapsedMinutes = ({
  since,
  enabled,
}: UseElapsedMinutesOptions): number | null => {
  const [appState, setAppState] = useState<AppStateStatus>(
    () => AppState.currentState,
  );
  const [now, setNow] = useState(() => Date.now());
  const isTicking = enabled && isForegroundAppState(appState);
  const [lastSnap, setLastSnap] = useState<ClockSnap>(() => ({
    isTicking,
    since,
  }));

  // Adjust during render so a resume or a refetch does not paint one frame of
  // an age measured from the frozen mount-time clock.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (
    isTicking !== lastSnap.isTicking ||
    (isTicking && since !== lastSnap.since)
  ) {
    setLastSnap({ isTicking, since });
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
    { delay: isTicking ? ELAPSED_MINUTES_TICK_MS : null },
  );

  // Clamped because `Date.now()` is wall-clock: a backwards clock correction
  // would otherwise produce a negative age.
  return since ? Math.floor(Math.max(0, now - since) / MS_PER_MINUTE) : null;
};
