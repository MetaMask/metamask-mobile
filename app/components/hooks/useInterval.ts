import { useRef, useEffect } from 'react';

interface IntervalOptions {
  delay?: number | null;
  immediate?: boolean;
}

function useInterval(callback: () => void, options: IntervalOptions) {
  const { delay = null, immediate = false } = options;

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
    if (delay !== null && delay > 0) {
      if (immediate) {
        tick();
      }
      const id = setInterval(tick, delay);

      return () => clearInterval(id);
    }
  }, [delay, immediate]);
}

export default useInterval;
