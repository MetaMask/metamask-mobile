import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  cancelAnimation,
  interpolateColor,
} from 'react-native-reanimated';
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
  getAnimatedStyle: {
    opacity: number;
    backgroundColor: string;
  };
  startPulseAnimation: (pulseColor: PulseColor) => void;
  stopAnimation: () => void;
}

/**
 * Custom hook for color-coded pulse animations using React Native Reanimated
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

  // Shared values for animations
  const pulseAnim = useSharedValue(1);
  const colorAnim = useSharedValue(0); // 0 = default, 1 = increase, -1 = decrease
  const isAnimating = useSharedValue(false);

  const startPulseAnimation = useCallback(
    (pulseColor: PulseColor) => {
      'worklet';

      // Stop any existing animation to prevent conflicts
      if (isAnimating.value) {
        cancelAnimation(pulseAnim);
        cancelAnimation(colorAnim);
      }

      // Set animation flag
      isAnimating.value = true;

      // Determine color animation target based on pulse type
      let colorTarget = 0; // default/same
      if (pulseColor === 'increase') {
        colorTarget = 1; // increase
      } else if (pulseColor === 'decrease') {
        colorTarget = -1; // decrease
      }

      // Start opacity pulse animation
      pulseAnim.value = withSequence(
        withTiming(minOpacity, { duration: pulseDuration }),
        withTiming(
          1,
          {
            duration: pulseDuration,
          },
          (finished) => {
            if (finished) {
              isAnimating.value = false;
            }
          },
        ),
      );

      // Start color change animation
      colorAnim.value = withSequence(
        withTiming(colorTarget, { duration: colorDuration }),
        withTiming(0, { duration: colorDuration * 2 }), // Longer fade out
      );
    },
    [
      pulseAnim,
      colorAnim,
      pulseDuration,
      colorDuration,
      minOpacity,
      isAnimating,
    ],
  );

  const getAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: pulseAnim.value,
      backgroundColor: interpolateColor(
        colorAnim.value,
        [-1, 0, 1],
        [colors.decrease, colors.same, colors.increase],
      ),
    }),
    [colors],
  );

  const stopAnimation = useCallback(() => {
    'worklet';

    cancelAnimation(pulseAnim);
    cancelAnimation(colorAnim);

    isAnimating.value = false;

    // Reset to default values
    pulseAnim.value = withTiming(1, { duration: 100 });
    colorAnim.value = withTiming(0, { duration: 100 });
  }, [pulseAnim, colorAnim, isAnimating]);

  return {
    getAnimatedStyle,
    startPulseAnimation,
    stopAnimation,
  };
};
