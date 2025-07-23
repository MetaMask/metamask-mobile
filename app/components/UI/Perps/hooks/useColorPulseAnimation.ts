import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { useStyles } from '../../../../component-library/hooks';

export type PulseColor = 'increase' | 'decrease' | 'same';

interface UseColorPulseAnimationOptions {
  pulseDuration?: number;
  colorDuration?: number;
  minOpacity?: number;
  colors?: {
    increase: string;
    decrease: string;
    same: string;
  };
}

interface UseColorPulseAnimationReturn {
  pulseAnim: Animated.Value;
  colorAnim: Animated.Value;
  startPulseAnimation: (pulseColor: PulseColor) => void;
  getAnimatedStyle: () => {
    opacity: Animated.Value;
    backgroundColor: Animated.AnimatedInterpolation<string | number>;
  };
  stopAnimation: () => void;
}

/**
 * Custom hook for color-coded pulse animations
 * Provides reusable pulse animation logic with color feedback
 *
 * @param options - Configuration options for the animation
 * @returns Animation values and control functions
 */
export const useColorPulseAnimation = (
  options: UseColorPulseAnimationOptions = {},
): UseColorPulseAnimationReturn => {
  const { theme } = useStyles(() => ({}), {});

  const {
    pulseDuration = 300,
    colorDuration = 200,
    minOpacity = 0.6,
    colors = {
      increase: `${theme.colors.success.default}1a`, // Success color with ~0.1 opacity (1a in hex)
      decrease: `${theme.colors.error.default}1a`, // Error color with ~0.1 opacity (1a in hex)
      same: 'transparent', // Gray/transparent
    },
  } = options;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current; // 0 = default, 1 = increase, -1 = decrease
  const currentAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulseAnimation = useCallback(
    (pulseColor: PulseColor) => {
      // Stop any existing animation to prevent conflicts
      if (currentAnimationRef.current) {
        currentAnimationRef.current.stop();
        currentAnimationRef.current = null;
      }

      // Determine color animation target based on pulse type
      let colorTarget = 0; // default/same
      if (pulseColor === 'increase') {
        colorTarget = 1; // increase
      } else if (pulseColor === 'decrease') {
        colorTarget = -1; // decrease
      }

      // Create a pulse animation with color change
      const animation = Animated.parallel([
        // Opacity pulse
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: minOpacity,
            duration: pulseDuration,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: pulseDuration,
            useNativeDriver: true,
          }),
        ]),
        // Color change
        Animated.sequence([
          Animated.timing(colorAnim, {
            toValue: colorTarget,
            duration: colorDuration,
            useNativeDriver: false, // Color interpolation doesn't support native driver
          }),
          Animated.timing(colorAnim, {
            toValue: 0, // Return to default color
            duration: colorDuration * 2, // Longer fade out
            useNativeDriver: false,
          }),
        ]),
      ]);

      // Store the animation reference and start it
      currentAnimationRef.current = animation;
      animation.start(({ finished }) => {
        if (finished) {
          currentAnimationRef.current = null;
        }
      });
    },
    [pulseAnim, colorAnim, pulseDuration, colorDuration, minOpacity],
  );

  const getAnimatedStyle = useCallback(
    () => ({
      opacity: pulseAnim,
      backgroundColor: colorAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [colors.decrease, colors.same, colors.increase],
      }),
    }),
    [pulseAnim, colorAnim, colors],
  );

  const stopAnimation = useCallback(() => {
    if (currentAnimationRef.current) {
      currentAnimationRef.current.stop();
      currentAnimationRef.current = null;
    }
  }, []);

  return {
    pulseAnim,
    colorAnim,
    startPulseAnimation,
    getAnimatedStyle,
    stopAnimation,
  };
};
