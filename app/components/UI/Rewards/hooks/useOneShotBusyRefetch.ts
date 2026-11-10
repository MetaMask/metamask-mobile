import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  busyRetryDelayMs,
  RewardsMoneyHttpError,
} from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';

/** Longest `Retry-After` this hook waits out. Anything longer is left alone. */
const BUSY_REFETCH_MAX_SECONDS = 30;

/**
 * Whether {@link useOneShotBusyRefetch} asks again for this failed read: a
 * `429` or `503` with a `Retry-After` of at most 30 seconds that the data
 * service has not already retried. A `503` at 30 is a statement timeout, and
 * a second 30-second query will not help, so the user retries by hand.
 * Callers that report failures use this to stay quiet until the refetch fails.
 */
export function willBusyRefetch(
  error: unknown,
): error is RewardsMoneyHttpError {
  if (!(error instanceof RewardsMoneyHttpError) || error.alreadyRetried) {
    return false;
  }
  if (error.status !== 429 && error.status !== 503) {
    return false;
  }
  const seconds = error.retryAfterSeconds;
  if (seconds === undefined || seconds > BUSY_REFETCH_MAX_SECONDS) {
    return false;
  }
  return !(error.status === 503 && seconds >= BUSY_REFETCH_MAX_SECONDS);
}

/**
 * Schedules one refetch for a busy read that {@link willBusyRefetch} accepts.
 * The wait is the `Retry-After` plus jitter: up to that much again for a
 * `503`, up to 1 second for a `429`. A newer fetch, a blur, or unmount
 * cancels it, and the follow-up itself must not arm another.
 *
 * `arm` also refuses while the screen is not focused. Blur alone only clears a
 * timer that already exists; a read that fails after the user left would
 * otherwise schedule a refetch on a Rewards tab that stays mounted.
 */
export function useOneShotBusyRefetch(): {
  cancel: () => void;
  arm: (error: unknown, refetch: () => void) => void;
  /** False before the first focus, and again after blur. */
  isFocused: () => boolean;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // False until the first focus effect. A network failure cannot land before
  // that effect has run, and starting false keeps a pre-focus arm from firing.
  const focusedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
        cancel();
      };
    }, [cancel]),
  );

  const arm = useCallback(
    (error: unknown, refetch: () => void) => {
      cancel();
      if (!focusedRef.current) {
        return;
      }
      if (!willBusyRefetch(error)) {
        return;
      }
      timerRef.current = setTimeout(
        () => {
          timerRef.current = null;
          refetch();
        },
        busyRetryDelayMs(error.retryAfterSeconds, error.status),
      );
    },
    [cancel],
  );

  const isFocused = useCallback(() => focusedRef.current, []);

  return { cancel, arm, isFocused };
}
