import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

export interface ShimmerOverlayProps {
  children: React.ReactNode;
  /**
   * Matches the wrapped element's border radius so the shimmer is clipped
   * to the same shape (the wrapper applies `overflow: hidden`).
   */
  borderRadius?: number;
  /**
   * Width of the shimmer band as a fraction of the measured container width.
   */
  widthFraction?: number;
  sweepDurationMs?: number;
  pauseDurationMs?: number;
  /**
   * Gradient stops for the shimmer band. Defaults to a subtle white sweep,
   * which works on dark surfaces. Override for light surfaces (e.g. the white
   * Primary button) with a dark gradient.
   */
  colors?: readonly string[];
  testID?: string;
}

const DEFAULT_COLORS = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.25)',
  'rgba(255,255,255,0)',
] as const;

const GRADIENT_START = { x: 0, y: 0.5 } as const;
const GRADIENT_END = { x: 1, y: 0.5 } as const;

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
  },
});

/**
 * Renders `children` and overlays a horizontal shimmer sweep on top of them.
 *
 * The wrapper clips the shimmer to the children's bounds (with an optional
 * matching `borderRadius`). The overlay is non-interactive, so the wrapped
 * element keeps receiving presses.
 */
const ShimmerOverlay: React.FC<ShimmerOverlayProps> = ({
  children,
  borderRadius,
  widthFraction = 0.5,
  sweepDurationMs = 1500,
  pauseDurationMs = 1500,
  colors = DEFAULT_COLORS,
  testID,
}) => {
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

  return (
    <View
      onLayout={handleLayout}
      style={[styles.wrapper, borderRadius !== undefined && { borderRadius }]}
    >
      {children}
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={styles.overlay}
          testID={testID}
        >
          <Animated.View
            style={[styles.band, { width: bandWidth }, animatedBandStyle]}
          >
            <LinearGradient
              colors={colors as unknown as string[]}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.gradient}
            />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

export default ShimmerOverlay;
