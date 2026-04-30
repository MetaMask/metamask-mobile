import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { isE2E } from '../../../../util/test/utils';

const BLINK_DURATION = 800;
const INITIAL_OPACITY = 1;

/**
 * Returns an animated opacity value that blinks between 1 and 0.
 * Used for the cosmetic input cursor on Ramp amount screens.
 * @param enabled - When false, the animation is stopped. Defaults to true.
 */
export function useBlinkingCursor(enabled = true): Animated.Value {
  const cursorOpacity = useRef(new Animated.Value(INITIAL_OPACITY)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === 'test' || isE2E || !enabled) {
      return;
    }

    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          duration: BLINK_DURATION,
          easing: Easing.linear,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          duration: BLINK_DURATION,
          easing: Easing.linear,
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
