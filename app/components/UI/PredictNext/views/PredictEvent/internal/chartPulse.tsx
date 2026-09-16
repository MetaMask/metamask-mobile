import React, { useEffect } from 'react';
import { Circle, G } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const ENDPOINT_RADIUS = 6;
const PULSE_RADIUS = ENDPOINT_RADIUS * 3.2;
const PULSE_DURATION = 3200;
const PULSE_OPACITY = 0.55;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ChartPulseProps {
  x: number;
  y: number;
  color: string;
  backgroundColor: string;
  testID: string;
  active: boolean;
}

export const ChartPulse = ({
  x,
  y,
  color,
  backgroundColor,
  testID,
  active,
}: ChartPulseProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (active) {
      progress.value = withRepeat(
        withTiming(1, {
          duration: PULSE_DURATION,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      );
    }

    return () => cancelAnimation(progress);
  }, [active, progress]);

  const animatedProps = useAnimatedProps(() => ({
    opacity:
      progress.value < 0.15
        ? (progress.value / 0.15) * PULSE_OPACITY
        : PULSE_OPACITY * (1 - (progress.value - 0.15) / 0.85),
    r: ENDPOINT_RADIUS + progress.value * (PULSE_RADIUS - ENDPOINT_RADIUS),
  }));

  return (
    <G>
      {active ? (
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={x}
          cy={y}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          testID={`${testID}-pulse`}
        />
      ) : null}
      <Circle
        cx={x}
        cy={y}
        r={ENDPOINT_RADIUS}
        fill={color}
        stroke={backgroundColor}
        strokeWidth={2}
        testID={testID}
      />
    </G>
  );
};
