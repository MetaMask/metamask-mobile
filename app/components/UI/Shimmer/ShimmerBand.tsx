import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const GRADIENT_START = { x: 0, y: 0.5 } as const;
const GRADIENT_END = { x: 1, y: 0.5 } as const;

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
  },
});

export interface ShimmerBandProps {
  bandWidth: number;
  /**
   * The animated transform from `useShimmerSweep` that slides the band across
   * its container.
   */
  animatedStyle: StyleProp<ViewStyle>;
  /**
   * Gradient stops for the band. Callers own the palette because it depends on
   * the surface (a subtle white sweep on dark surfaces, a bright glint over
   * coloured text, ...).
   */
  colors: readonly string[];
}

/**
 * The moving highlight band shared by every shimmer: an absolutely-positioned
 * animated view filled with a horizontal gradient. Callers clip it to their own
 * shape — a rounded rectangle, a glyph mask, and so on.
 */
const ShimmerBand: React.FC<ShimmerBandProps> = ({
  bandWidth,
  animatedStyle,
  colors,
}) => (
  <Animated.View style={[styles.band, { width: bandWidth }, animatedStyle]}>
    <LinearGradient
      colors={colors as unknown as string[]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={styles.gradient}
    />
  </Animated.View>
);

export default ShimmerBand;
