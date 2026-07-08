import MaskedView from '@react-native-masked-view/masked-view';
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

export interface TextShimmerProps {
  /**
   * The text element to shimmer. It is rendered as-is for its colour and
   * reused as the mask, so the highlight is clipped to the glyph shapes
   * rather than a rectangle.
   */
  children: React.ReactElement;
  /**
   * Width of the highlight band as a fraction of the measured text width.
   */
  widthFraction?: number;
  sweepDurationMs?: number;
  pauseDurationMs?: number;
  /**
   * Gradient stops for the highlight band. Defaults to a bright white sweep
   * that reads as a reflective glint over coloured text.
   */
  colors?: readonly string[];
  testID?: string;
}

const DEFAULT_COLORS = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.7)',
  'rgba(255,255,255,0)',
] as const;

const GRADIENT_START = { x: 0, y: 0.5 } as const;
const GRADIENT_END = { x: 1, y: 0.5 } as const;

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
 * Renders `children` (a text element) and sweeps a bright highlight across it,
 * masked to the glyph shapes. The overlay is non-interactive.
 */
const TextShimmer: React.FC<TextShimmerProps> = ({
  children,
  widthFraction = 0.5,
  sweepDurationMs = 1000,
  pauseDurationMs = 4000,
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
    <View onLayout={handleLayout} style={styles.wrapper}>
      {children}
      {width > 0 && (
        <MaskedView
          pointerEvents="none"
          style={styles.overlay}
          maskElement={children}
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
        </MaskedView>
      )}
    </View>
  );
};

export default TextShimmer;
