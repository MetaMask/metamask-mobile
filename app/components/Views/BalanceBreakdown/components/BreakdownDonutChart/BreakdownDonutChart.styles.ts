import type { Animated } from 'react-native';

export function breakdownDonutChartWrapperStyle(
  size: number,
  rotate: Animated.AnimatedInterpolation<string | number>,
): {
  width: number;
  height: number;
  transform: { rotate: Animated.AnimatedInterpolation<string | number> }[];
} {
  return {
    width: size,
    height: size,
    transform: [{ rotate }],
  };
}
