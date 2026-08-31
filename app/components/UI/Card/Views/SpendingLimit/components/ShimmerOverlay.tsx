import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ShimmerBand, useShimmerSweep } from '../../../../Shimmer';

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

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
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
  const { width, bandWidth, animatedBandStyle, handleLayout } = useShimmerSweep(
    { widthFraction, sweepDurationMs, pauseDurationMs },
  );

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
          <ShimmerBand
            bandWidth={bandWidth}
            animatedStyle={animatedBandStyle}
            colors={colors}
          />
        </Animated.View>
      )}
    </View>
  );
};

export default ShimmerOverlay;
