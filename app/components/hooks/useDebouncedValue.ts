import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

/**
 * Generic hook to debounce any value.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds (default: 300ms).
 * @returns The debounced value.
 */
export const useDebouncedValue = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedValue(value);
    }, delay);

    handler();

    return () => handler.cancel();
  }, [value, delay]);

  return debouncedValue;
};
