import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder } from 'react-native';
import { isAvailableBucket, type EarningsPoint } from './earningsHistory';

interface UseEarningsChartScrubParams {
  points: EarningsPoint[];
  plotWidth: number;
  setScrollEnabled?: (enabled: boolean) => void;
  onActiveIndexChange?: (index: number | null) => void;
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
  onActiveIndexChange,
}: UseEarningsChartScrubParams): UseEarningsChartScrubResult => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  const isScrubbing = useRef(false);
  const scrubOriginX = useRef(0);

  const updateActiveIndex = useCallback(
    (index: number | null): void => {
      if (activeIndexRef.current === index) {
        return;
      }

      activeIndexRef.current = index;
      setActiveIndex(index);
      onActiveIndexChange?.(index);
    },
    [onActiveIndexChange],
  );

  const handlePointPressIn = useCallback(
    (index: number, point: EarningsPoint): void => {
      scrubOriginX.current = ((index + 0.5) / points.length) * plotWidth;

      if (isAvailableBucket(point)) {
        updateActiveIndex(index);
      }
    },
    [plotWidth, points.length, updateActiveIndex],
  );

  const handlePointPressOut = useCallback((): void => {
    if (!isScrubbing.current) {
      updateActiveIndex(null);
    }
  }, [updateActiveIndex]);

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

      updateActiveIndex(isAvailableBucket(points[index]) ? index : null);
    },
    [plotWidth, points, updateActiveIndex],
  );

  const clearActiveSelection = useCallback((): void => {
    isScrubbing.current = false;
    updateActiveIndex(null);
    setScrollEnabled?.(true);
  }, [setScrollEnabled, updateActiveIndex]);

  const resetSelection = useCallback((): void => {
    updateActiveIndex(null);
  }, [updateActiveIndex]);

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
