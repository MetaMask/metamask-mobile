import { useEffect, useState } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface ShimmerSweepOptions {
  /**
   * Width of the highlight band as a fraction of the measured element width.
   */
  widthFraction: number;
  sweepDurationMs: number;
  pauseDurationMs: number;
}

/**
 * Drives a horizontal highlight band across a measured element: it sweeps once,
 * pauses, then repeats. Returns the measured width (so callers can defer
 * rendering until the element has a size), the band width, the animated
 * transform to apply to the band, and an `onLayout` handler to feed the
 * measurement back in.
 */
export const useShimmerSweep = ({
  widthFraction,
  sweepDurationMs,
  pauseDurationMs,
}: ShimmerSweepOptions) => {
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);
  const bandWidth = width * widthFraction;

  useEffect(() => {
    if (width === 0) return;

    translateX.value = -bandWidth;
    translateX.value = withRepeat(
      withSequence(
        withTiming(width, {
          duration: sweepDurationMs,
          easing: Easing.inOut(Easing.ease),
        }),
        withDelay(pauseDurationMs, withTiming(-bandWidth, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [width, bandWidth, sweepDurationMs, pauseDurationMs, translateX]);

  const animatedBandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) {
      setWidth(next);
    }
  };

  return { width, bandWidth, animatedBandStyle, handleLayout };
};
