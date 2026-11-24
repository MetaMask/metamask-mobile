import { useEffect, useRef, useState } from 'react';

/**
 * Retries an estimate the controller could not make yet when the market's
 * price stream ticks. No timer: the account stream drops identical frames, so
 * a flat account alone would never re-request.
 *
 * @param isMissing - Whether the current estimate is unavailable.
 * @param priceTick - Moves with every price update, such as its timestamp.
 * @returns A counter that changes on every retry.
 */
export const useRetryOnPriceTick = (
  isMissing: boolean,
  priceTick: number | undefined,
): number => {
  const [attempt, setAttempt] = useState(0);
  // The tick the missing result was first seen at; null while nothing is missing.
  const seenAt = useRef<{ tick: number | undefined } | null>(null);

  useEffect(() => {
    if (!isMissing) {
      seenAt.current = null;
      return;
    }
    if (seenAt.current === null) {
      seenAt.current = { tick: priceTick };
      return;
    }
    if (priceTick !== seenAt.current.tick) {
      seenAt.current = { tick: priceTick };
      setAttempt((value) => value + 1);
    }
  }, [isMissing, priceTick]);

  return attempt;
};
