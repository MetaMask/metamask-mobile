import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, View } from 'react-native';

const POLL_INTERVAL_MS = 250;
const DEFAULT_AREA_THRESHOLD = 0.5;

/**
 * Hook that detects when a component first scrolls into the viewport.
 * Attaches the returned ref to a View (with collapsable={false} on Android).
 * Calls `onVisible` exactly once when the required fraction of the component
 * is visible on screen, then stops polling.
 *
 * @param onVisible - Callback fired once when visibility threshold is met.
 * @param areaThreshold - Fraction of the component height that must be visible (0–1, default 0.5).
 */
export const useViewportTracking = (
  onVisible: () => void,
  areaThreshold = DEFAULT_AREA_THRESHOLD,
) => {
  const ref = useRef<View>(null);
  const hasFired = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkVisibility = useCallback(() => {
    if (hasFired.current || !ref.current) return;

    ref.current.measure((_x, _y, _width, height, _pageX, pageY) => {
      if (height === 0 || hasFired.current) return;

      const screenHeight = Dimensions.get('window').height;
      const visibleTop = Math.max(pageY, 0);
      const visibleBottom = Math.min(pageY + height, screenHeight);
      const visibleFraction = (visibleBottom - visibleTop) / height;
      if (visibleFraction >= areaThreshold) {
        hasFired.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onVisible();
      }
    });
  }, [onVisible, areaThreshold]);

  const onLayout = useCallback(() => {
    checkVisibility();

    if (!hasFired.current && !intervalRef.current) {
      intervalRef.current = setInterval(checkVisibility, POLL_INTERVAL_MS);
    }
  }, [checkVisibility]);

  useEffect(
    () => () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
    [],
  );

  return { ref, onLayout };
};
