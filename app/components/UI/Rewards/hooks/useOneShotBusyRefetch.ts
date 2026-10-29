import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';

/**
 * Longest `Retry-After` this hook waits out. The data service retries at most
 * 5 seconds, so a statement timeout's 30 arrives here without that retry.
 * Anything longer is left alone.
 */
const BUSY_REFETCH_MAX_SECONDS = 30;

/** Spread refetches so a slow-query spike does not return in the same second. */
const BUSY_REFETCH_JITTER_MS = 1000;

/** 0..BUSY_REFETCH_JITTER_MS inclusive. Jitter only, not a secret. */
function busyRefetchJitterMs(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] % (BUSY_REFETCH_JITTER_MS + 1);
}

function retryAfterSeconds(error: unknown): number | undefined {
  if (!(error instanceof RewardsMoneyHttpError)) {
    return undefined;
  }
  const seconds = error.retryAfterSeconds;
  if (seconds === undefined || seconds > BUSY_REFETCH_MAX_SECONDS) {
    return undefined;
  }
  return seconds;
}

/**
 * Schedules one refetch for a busy read. A `Retry-After` of 5 seconds or less
 * has already been retried once inside the data service. A statement timeout's
 * 30 has not, so this wait is its first. The timer adds up to a second of
 * jitter. A newer fetch, a blur, or unmount cancels it, and the follow-up
 * itself must not arm another.
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
      const waitSeconds = retryAfterSeconds(error);
      if (waitSeconds === undefined) {
        return;
      }
      timerRef.current = setTimeout(
        () => {
          timerRef.current = null;
          refetch();
        },
        waitSeconds * 1000 + busyRefetchJitterMs(),
      );
    },
    [cancel],
  );

  const isFocused = useCallback(() => focusedRef.current, []);

  return { cancel, arm, isFocused };
}
