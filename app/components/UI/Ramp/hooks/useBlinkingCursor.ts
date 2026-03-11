import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

const BLINK_DURATION = 800;
const INITIAL_OPACITY = 0.6;

/**
 * Returns an animated opacity value that blinks between 0 and 1.
 * Used for the cosmetic input cursor on Ramp amount screens.
 * @param enabled - When false, the animation is stopped. Defaults to true.
 */
export function useBlinkingCursor(enabled = true): Animated.Value {
  const cursorOpacity = useRef(new Animated.Value(INITIAL_OPACITY)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === 'test' || !enabled) {
      return;
    }

    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          duration: BLINK_DURATION,
          easing: Easing.bounce,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          duration: BLINK_DURATION,
          easing: Easing.bounce,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();

    return () => {
      blinkAnimation.stop();
    };
  }, [cursorOpacity, enabled]);

  return cursorOpacity;
}
