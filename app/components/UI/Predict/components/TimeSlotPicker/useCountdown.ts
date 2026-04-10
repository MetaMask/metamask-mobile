import { useState, useEffect, useRef, useCallback } from 'react';
import { COUNTDOWN_INTERVAL_MS } from './TimeSlotPicker.constants';

/**
 * Returns the remaining time until `targetDate` as "MM:SS".
 * Returns `null` when the target is in the past or undefined.
 */
export const useCountdown = (targetDate: string | undefined): string | null => {
  const getRemainingSeconds = useCallback((): number => {
    if (!targetDate) return 0;
    const diff = new Date(targetDate).getTime() - Date.now();
    return diff > 0 ? Math.floor(diff / 1000) : 0;
  }, [targetDate]);

  const [remaining, setRemaining] = useState<number>(getRemainingSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const seconds = getRemainingSeconds();
    setRemaining(seconds);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (seconds <= 0) return;

    intervalRef.current = setInterval(() => {
      const next = getRemainingSeconds();
      setRemaining(next);
      if (next <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, COUNTDOWN_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [getRemainingSeconds]);

  if (remaining <= 0) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
