import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder } from 'react-native';
import { isAvailableBucket, type EarningsPoint } from './earningsHistory';

interface UseEarningsChartScrubParams {
  points: EarningsPoint[];
  plotWidth: number;
  setScrollEnabled?: (enabled: boolean) => void;
}

interface UseEarningsChartScrubResult {
  activeIndex: number | null;
  handlePointPressIn: (index: number, point: EarningsPoint) => void;
  handlePointPressOut: () => void;
  panResponder: ReturnType<typeof PanResponder.create>;
  resetSelection: () => void;
}

export const useEarningsChartScrub = ({
  points,
  plotWidth,
  setScrollEnabled,
}: UseEarningsChartScrubParams): UseEarningsChartScrubResult => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isScrubbing = useRef(false);
  const scrubOriginX = useRef(0);

  const handlePointPressIn = useCallback(
    (index: number, point: EarningsPoint): void => {
      if (isAvailableBucket(point)) {
        scrubOriginX.current = ((index + 0.5) / points.length) * plotWidth;
        setActiveIndex(index);
      }
    },
    [plotWidth, points.length],
  );

  const handlePointPressOut = useCallback((): void => {
    if (!isScrubbing.current) {
      setActiveIndex(null);
    }
  }, []);

  const selectPointAtX = useCallback(
    (locationX: number): void => {
      if (plotWidth <= 0 || points.length === 0) {
        return;
      }

      const clampedX = Math.max(0, Math.min(locationX, plotWidth));
      const index = Math.min(
        Math.floor((clampedX / plotWidth) * points.length),
        points.length - 1,
      );

      setActiveIndex(isAvailableBucket(points[index]) ? index : null);
    },
    [plotWidth, points],
  );

  const clearActiveSelection = useCallback((): void => {
    isScrubbing.current = false;
    setActiveIndex(null);
    setScrollEnabled?.(true);
  }, [setScrollEnabled]);

  const resetSelection = useCallback((): void => {
    setActiveIndex(null);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => {
          // Parent ScrollView is paused while the finger is on the plot, so
          // any movement here is a scrub.
          isScrubbing.current = true;
          return true;
        },
        // Once we're scrubbing, don't let an ancestor ScrollView reclaim the
        // gesture mid-drag on small vertical drift.
        onPanResponderTerminationRequest: () => !isScrubbing.current,
        onPanResponderGrant: (_event, gestureState) =>
          selectPointAtX(
            scrubOriginX.current + gestureState.moveX - gestureState.x0,
          ),
        onPanResponderMove: (_event, gestureState) =>
          selectPointAtX(
            scrubOriginX.current + gestureState.moveX - gestureState.x0,
          ),
        onPanResponderRelease: clearActiveSelection,
        onPanResponderTerminate: clearActiveSelection,
      }),
    [clearActiveSelection, selectPointAtX],
  );

  return {
    activeIndex,
    handlePointPressIn,
    handlePointPressOut,
    panResponder,
    resetSelection,
  };
};
