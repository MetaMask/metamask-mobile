import { useRef, useEffect } from 'react';

interface IntervalOptions {
  delay?: number | null;
  immediate?: boolean;
}

function useInterval(callback: () => void, options: IntervalOptions) {
  const savedCallback = useRef<() => void>();

  // Remember the latest function.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    const { delay = null, immediate = false } = options;
    if (delay !== null && delay > 0) {
      if (immediate) {
        tick();
      }
      const id = setInterval(tick, delay);

      return () => clearInterval(id);
    }
  }, [options]);
}

export default useInterval;
