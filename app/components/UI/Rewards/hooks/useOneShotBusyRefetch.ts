import { useCallback, useEffect, useRef } from 'react';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';

/**
 * After a read has already retried once inside the data service, schedule one
 * more refetch when the failure still carries `Retry-After`. A newer fetch
 * or unmount cancels it, and the follow-up itself must not arm another.
 */
export function useOneShotBusyRefetch(): {
  cancel: () => void;
  arm: (error: unknown, refetch: () => void) => void;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const arm = useCallback(
    (error: unknown, refetch: () => void) => {
      cancel();
      if (
        !(error instanceof RewardsMoneyHttpError) ||
        error.retryAfterSeconds === undefined
      ) {
        return;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        refetch();
      }, error.retryAfterSeconds * 1000);
    },
    [cancel],
  );

  return { cancel, arm };
}
