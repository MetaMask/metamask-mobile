import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface FadeInUpProps {
  children: React.ReactNode;
  /** Milliseconds to wait before animating in. */
  delayMs?: number;
  durationMs?: number;
  /** Distance travelled on the way in, in points. Positive enters from below. */
  travel?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Fades and slides its children into place once, on mount.
 *
 * Children stay mounted and laid out throughout — only opacity and transform
 * animate — so nothing around them reflows mid-sequence.
 *
 * Honours Reduce Motion by rendering the final state immediately.
 */
const FadeInUp = ({
  children,
  delayMs = 0,
  durationMs = 340,
  travel = 10,
  style,
  testID,
}: FadeInUpProps) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delayMs, durationMs, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * travel }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} testID={testID}>
      {children}
    </Animated.View>
  );
};

export default FadeInUp;
