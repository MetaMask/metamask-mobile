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

interface FadeSlideInProps {
  children: React.ReactNode;
  /** Milliseconds to wait before this element animates in. */
  delayMs?: number;
  durationMs?: number;
  /**
   * Offset the element travels from, in points. Positive enters from below,
   * negative from above.
   */
  fromTranslateY?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Fades and slides its children into place once, on mount.
 *
 * Children stay mounted and laid out throughout — only opacity and transform
 * animate — so surrounding layout never reflows mid-sequence. That matters for
 * the Benefits intro, where the Rive icon animates towards a resting position
 * whose coordinates depend on the content below it already occupying space.
 *
 * Honours Reduce Motion by rendering the final state immediately.
 */
const FadeSlideIn = ({
  children,
  delayMs = 0,
  durationMs = 320,
  fromTranslateY = 12,
  style,
  testID,
}: FadeSlideInProps) => {
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
    transform: [{ translateY: (1 - progress.value) * fromTranslateY }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} testID={testID}>
      {children}
    </Animated.View>
  );
};

export default FadeSlideIn;
