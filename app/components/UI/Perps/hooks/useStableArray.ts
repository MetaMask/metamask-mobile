import { useMemo, useRef } from 'react';

/**
 * Custom hook for stable array reference
 */
export function useStableArray<T>(array: T[]): T[] {
  const ref = useRef<T[]>();

  return useMemo(() => {
    if (
      !ref.current ||
      ref.current.length !== array.length ||
      !ref.current.every((item, index) => item === array[index])
    ) {
      ref.current = array;
    }
    return ref.current;
  }, [array]);
}
