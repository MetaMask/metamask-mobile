import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Gives the native shell a frame opportunity before mounting deferred work.
 * A layout callback alone is not a presentation signal: rAF runs before a
 * frame, so yield through two callbacks rather than doing work in the first.
 * The owner must be keyed by transaction so readiness cannot leak to the next.
 */
export function useAfterFirstLayout() {
  const [isReady, setIsReady] = useState(false);
  const isMounted = useRef(true);
  const isScheduled = useRef(false);
  const frame = useRef<number | undefined>(undefined);

  const onLayout = useCallback(() => {
    if (isScheduled.current || !isMounted.current) {
      return;
    }

    isScheduled.current = true;
    frame.current = requestAnimationFrame(() => {
      if (!isMounted.current) {
        return;
      }
      frame.current = requestAnimationFrame(() => {
        frame.current = undefined;
        if (isMounted.current) {
          setIsReady(true);
        }
      });
    });
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      isScheduled.current = false;
      if (frame.current !== undefined) {
        cancelAnimationFrame(frame.current);
        frame.current = undefined;
      }
    };
  }, []);

  return { isReady, onLayout };
}
