import { useRef, useCallback } from 'react';
import { Animated, Easing, GestureResponderEvent } from 'react-native';

const SCALE_PRESSED = 0.98;
const SCALE_NORMAL = 1;
const ANIMATION_DURATION = 150;

/**
 * Options for useAnimatedPressable hook.
 */
export interface UseAnimatedPressableOptions {
  /**
   * Optional callback invoked when press starts (after starting scale animation).
   */
  onPressIn?: (event: GestureResponderEvent) => void;
  /**
   * Optional callback invoked when press ends (after starting scale animation).
   */
  onPressOut?: (event: GestureResponderEvent) => void;
}

/**
 * Return value of useAnimatedPressable hook.
 */
export interface UseAnimatedPressableReturn {
  /**
   * Animated value for scale transform (1 = normal, 0.98 = pressed).
   */
  scaleAnim: Animated.Value;
  /**
   * Handler to pass to Pressable onPressIn.
   */
  handlePressIn: (event: GestureResponderEvent) => void;
  /**
   * Handler to pass to Pressable onPressOut.
   */
  handlePressOut: (event: GestureResponderEvent) => void;
}

/**
 * Hook that provides a scale-down-on-press animation and handlers for use with Pressable.
 * Use the returned scaleAnim as a transform on an Animated.View wrapping the Pressable,
 * and pass handlePressIn/handlePressOut to the Pressable.
 *
 * @param options Optional onPressIn/onPressOut callbacks to be invoked after starting the animation.
 * @returns scaleAnim, handlePressIn, and handlePressOut for use in an animated pressable button.
 */
export function useAnimatedPressable(
  options: UseAnimatedPressableOptions = {},
): UseAnimatedPressableReturn {
  const { onPressIn, onPressOut } = options;
  const scaleAnim = useRef(new Animated.Value(SCALE_NORMAL)).current;

  const handlePressIn = useCallback(
    (pressEvent: GestureResponderEvent) => {
      Animated.timing(scaleAnim, {
        toValue: SCALE_PRESSED,
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
      onPressIn?.(pressEvent);
    },
    [scaleAnim, onPressIn],
  );

  const handlePressOut = useCallback(
    (pressEvent: GestureResponderEvent) => {
      Animated.timing(scaleAnim, {
        toValue: SCALE_NORMAL,
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
      onPressOut?.(pressEvent);
    },
    [scaleAnim, onPressOut],
  );

  return { scaleAnim, handlePressIn, handlePressOut };
}
