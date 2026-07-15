import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, View } from 'react-native';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

const POLL_INTERVAL_MS = 250;
const DEFAULT_AREA_THRESHOLD = 0.5;

/**
 * Hook that detects when a component first scrolls into the viewport.
 * Attaches the returned ref to a non-collapsable native view and calls
 * `onVisible` exactly once when the required fraction is visible on screen.
 *
 * Performance: polls via setInterval + measure() every 250ms until visible.
 * A trace (MarketInsightsViewportTracking) records how long polling ran and
 * how many measure() calls were made so the cost is observable in Sentry.
 *
 * @param onVisible - Callback fired once when visibility threshold is met.
 * @param areaThreshold - Fraction of the component height that must be visible.
 * @returns A ref and onLayout callback to attach to the tracked view.
 */
export const useViewportTracking = (
  onVisible: () => void,
  areaThreshold = DEFAULT_AREA_THRESHOLD,
) => {
  const ref = useRef<View>(null);
  const hasFired = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onVisibleRef = useRef(onVisible);
  const measureCountRef = useRef(0);
  const traceStartedRef = useRef(false);

  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  const checkVisibility = useCallback(() => {
    if (hasFired.current || !ref.current) {
      return;
    }

    measureCountRef.current += 1;

    ref.current.measureInWindow((_x, y, _width, height) => {
      if (height === 0 || hasFired.current) {
        return;
      }

      const screenHeight = Dimensions.get('window').height;
      const visibleTop = Math.max(y, 0);
      const visibleBottom = Math.min(y + height, screenHeight);
      const visibleFraction = (visibleBottom - visibleTop) / height;

      if (visibleFraction >= areaThreshold) {
        hasFired.current = true;

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        endTrace({
          name: TraceName.MarketInsightsViewportTracking,
          data: {
            measure_calls: measureCountRef.current,
            resolved_by: 'visibility_threshold',
          },
        });

        onVisibleRef.current();
      }
    });
  }, [areaThreshold]);

  const onLayout = useCallback(() => {
    if (!traceStartedRef.current) {
      traceStartedRef.current = true;
      trace({
        name: TraceName.MarketInsightsViewportTracking,
        op: TraceOperation.MarketInsightsViewportTracking,
      });
    }

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

      if (traceStartedRef.current && !hasFired.current) {
        endTrace({
          name: TraceName.MarketInsightsViewportTracking,
          data: {
            measure_calls: measureCountRef.current,
            resolved_by: 'unmount',
          },
        });
      }
    },
    [],
  );

  return { ref, onLayout };
};
