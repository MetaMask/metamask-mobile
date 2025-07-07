import { useMemo, useRef } from 'react';

/**
 * Custom hook for stable array reference to prevent infinite re-renders
 * Uses deep comparison with ref caching for performance
 */
export function useStableArray<T>(array: T[]): T[] {
  const ref = useRef<T[]>();

  return useMemo(() => {
    // Deep compare arrays by content, not reference
    if (!ref.current ||
        ref.current.length !== array.length ||
        !ref.current.every((item, index) => item === array[index])) {
      ref.current = array;
    }
    return ref.current;
  }, [array]);
}
