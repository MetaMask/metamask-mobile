import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Like useFocusEffect, but skips the callback if it ran less than throttleMs ago.
 * Pass a memoized callback (via useCallback) just as you would with useFocusEffect.
 */
export function useThrottledFocusEffect(
  callback: Parameters<typeof useFocusEffect>[0],
  throttleMs: number,
): void {
  const lastRunRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (
        lastRunRef.current !== null &&
        now - lastRunRef.current < throttleMs
      ) {
        return;
      }
      lastRunRef.current = now;
      const cleanup = callback();

      return () => {
        // Reset the timestamp so that a blur-triggered abort does not block
        // the next focus from restarting the work.
        lastRunRef.current = null;
        cleanup?.();
      };
    }, [callback, throttleMs]),
  );
}
