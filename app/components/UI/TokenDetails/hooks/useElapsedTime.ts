import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import useInterval from '../../../hooks/useInterval';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

const isForegroundAppState = (appState: AppStateStatus): boolean =>
  appState !== 'background' && appState !== 'inactive';

const getTickDelayMs = (elapsedMs: number): number | null => {
  if (elapsedMs < MINUTE_MS) {
    const intoSecond = elapsedMs % SECOND_MS;
    return intoSecond === 0 ? SECOND_MS : SECOND_MS - intoSecond;
  }

  if (elapsedMs < HOUR_MS) {
    const intoMinute = elapsedMs % MINUTE_MS;
    return intoMinute === 0 ? MINUTE_MS : MINUTE_MS - intoMinute;
  }

  return null;
};

export interface UseElapsedTimeOptions {
  /**
   * Instant being measured from, typically a query's `dataUpdatedAt`. `0` or
   * `undefined` means nothing has been fetched yet, which is the only case
   * that yields `null`.
   */
  since: number | undefined;
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
 * Ticks only while the app is not backgrounded or inactive (`unknown` still
 * ticks, which is RN's state before the first AppState event).
 *
 * @param options - Instant to measure from.
 * @returns Whole minutes elapsed, or `null` when `since` is unset.
 */
export const useElapsedTime = ({
  since,
}: UseElapsedTimeOptions): number | null => {
  const [appState, setAppState] = useState<AppStateStatus>(
    () => AppState.currentState,
  );
  const [now, setNow] = useState(() => Date.now());
  const isTicking = isForegroundAppState(appState);
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

  const elapsedMs = since ? Math.max(0, now - since) : 0;

  useInterval(
    () => {
      setNow(Date.now());
    },
    { delay: isTicking && since ? getTickDelayMs(elapsedMs) : null },
  );

  // Clamped because `Date.now()` is wall-clock: a backwards clock correction
  // would otherwise produce a negative age.
  return since ? Math.floor(elapsedMs / MINUTE_MS) : null;
};
