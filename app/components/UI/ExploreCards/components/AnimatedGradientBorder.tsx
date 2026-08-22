import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import { CARD_BORDER_SHIFT_DURATION_MS, CARD_BORDER_WIDTH } from '../constants';

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

const DEFAULT_BORDER_RADIUS = 24;

const styles = StyleSheet.create({
  inner: { margin: CARD_BORDER_WIDTH },
});

export interface AnimatedGradientBorderProps {
  /** Two-stop accent gradient for the border. */
  colors: [string, string];
  /** Stretch to fill the parent (deck cards). Off for intrinsic-height uses. */
  fill?: boolean;
  /** Outer corner radius; the inner surface derives its own from it. */
  borderRadius?: number;
  children: React.ReactNode;
  testID?: string;
}

/**
 * Card shell with a colourful gradient border that slowly "breathes": a
 * reversed copy of the gradient is stacked on top and cross-faded in an
 * auto-reversing loop, so the colours appear to travel around the frame.
 */
const AnimatedGradientBorder: React.FC<AnimatedGradientBorderProps> = ({
  colors,
  fill = true,
  borderRadius = DEFAULT_BORDER_RADIUS,
  children,
  testID,
}) => {
  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withRepeat(
      withTiming(1, { duration: CARD_BORDER_SHIFT_DURATION_MS }),
      -1,
      true,
    );
  }, [shift]);

  const shiftStyle = useAnimatedStyle(() => ({ opacity: shift.value }));

  const reversedColors = useMemo(() => [colors[1], colors[0]], [colors]);

  return (
    <Box
      twClassName={`overflow-hidden shadow-lg ${fill ? 'flex-1' : ''}`}
      style={{ borderRadius }}
      testID={testID}
    >
      <LinearGradient
        colors={colors}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, shiftStyle]}>
        <LinearGradient
          colors={reversedColors}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Box
        twClassName={`bg-default overflow-hidden ${fill ? 'flex-1' : ''}`}
        style={[
          styles.inner,
          { borderRadius: borderRadius - CARD_BORDER_WIDTH },
        ]}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AnimatedGradientBorder;
