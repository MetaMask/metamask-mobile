import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, type View } from 'react-native';

const DEFAULT_POLL_MS = 500;
const DEFAULT_AREA_THRESHOLD = 0.3;

interface UseIsInViewportOptions {
  /** Fraction of component height that must be on-screen to count as visible (0–1). */
  areaThreshold?: number;
  /** How often to re-measure, in milliseconds. */
  pollIntervalMs?: number;
}

/**
 * Continuously tracks whether a component is within the visible screen area.
 *
 * Attach the returned `ref` to a `View` (with `collapsable={false}` on
 * Android) and spread `onLayout` onto the same View. The hook polls
 * `measureInWindow` and returns `true` while the required fraction of the
 * component is on-screen.
 *
 * Polling starts on the first layout event and stops on unmount.
 */
export function useIsInViewport(options: UseIsInViewportOptions = {}) {
  const {
    areaThreshold = DEFAULT_AREA_THRESHOLD,
    pollIntervalMs = DEFAULT_POLL_MS,
  } = options;

  const ref = useRef<View>(null);
  const [isInViewport, setIsInViewport] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const measure = useCallback(() => {
    if (!ref.current) return;

    ref.current.measureInWindow((_x, y, _width, height) => {
      if (height === 0) return;

      const screenHeight = Dimensions.get('window').height;
      const visibleTop = Math.max(y, 0);
      const visibleBottom = Math.min(y + height, screenHeight);
      const visibleFraction = (visibleBottom - visibleTop) / height;

      setIsInViewport(visibleFraction >= areaThreshold);
    });
  }, [areaThreshold]);

  const onLayout = useCallback(() => {
    measure();
    if (!intervalRef.current) {
      intervalRef.current = setInterval(measure, pollIntervalMs);
    }
  }, [measure, pollIntervalMs]);

  useEffect(
    () => () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
    [],
  );

  return { ref, onLayout, isInViewport };
}
