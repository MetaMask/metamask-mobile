import { useRef } from 'react';
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

  useFocusEffect(() => {
    const now = Date.now();
    if (lastRunRef.current !== null && now - lastRunRef.current < throttleMs) {
      return;
    }
    lastRunRef.current = now;
    return callback();
  });
}
