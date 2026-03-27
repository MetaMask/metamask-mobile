import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  BORDER_FADE_IN_FRACTION,
  BORDER_FADE_OUT_FRACTION,
  BORDER_GRADIENT_COLORS,
  BORDER_RADIUS,
  BORDER_STROKE_WIDTH,
  BORDER_SWEEP_DURATION_MS,
  BORDER_TRAIL_FRACTION,
} from './AnimatedGradientBorder.constants';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const GRADIENT_ID = 'borderGradient';

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

/**
 * Rounded rectangle path inset by half the stroke width so the stroke's
 * outer edge aligns with the card border. Starts at the bottom-left corner,
 * tracing clockwise: left↑ → top→ → right↓ → bottom← → back to start.
 * Not closed with Z so the dash pattern begins exactly at the start point.
 */
function buildRoundedRectPath(
  width: number,
  height: number,
  r: number,
  strokeWidth: number,
): string {
  const hw = strokeWidth / 2;
  const er = r - hw;
  return [
    `M ${hw} ${height - hw - er}`,
    `V ${hw + er}`,
    `A ${er} ${er} 0 0 1 ${hw + er} ${hw}`,
    `H ${width - hw - er}`,
    `A ${er} ${er} 0 0 1 ${width - hw} ${hw + er}`,
    `V ${height - hw - er}`,
    `A ${er} ${er} 0 0 1 ${width - hw - er} ${height - hw}`,
    `H ${hw + er}`,
    `A ${er} ${er} 0 0 1 ${hw} ${height - hw - er}`,
  ].join(' ');
}

function calcPerimeter(
  width: number,
  height: number,
  r: number,
  strokeWidth: number,
): number {
  const hw = strokeWidth / 2;
  const er = r - hw;
  const insetW = width - 2 * hw;
  const insetH = height - 2 * hw;
  return 2 * (insetW - 2 * er) + 2 * (insetH - 2 * er) + 2 * Math.PI * er;
}

interface SweepPathProps {
  pathData: string;
  perimeter: number;
  progress: Animated.SharedValue<number>;
  strokeWidth: number;
  /** Extra multiplier applied on top of the lifecycle fade */
  opacityScale: number;
}

const SweepPath: React.FC<SweepPathProps> = ({
  pathData,
  perimeter,
  progress,
  strokeWidth,
  opacityScale,
}) => {
  const trailLength = perimeter * BORDER_TRAIL_FRACTION;
  const gap = perimeter - trailLength;

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const p = progress.value;
    const startShift = perimeter * BORDER_FADE_IN_FRACTION * 0.5;
    const dashOffset = perimeter * (1 - p) + startShift;

    const fadeIn = Math.min(p / BORDER_FADE_IN_FRACTION, 1);
    const fadeOut = Math.min((1 - p) / BORDER_FADE_OUT_FRACTION, 1);
    const lifecycle = Math.min(fadeIn, fadeOut);

    return {
      strokeDashoffset: dashOffset,
      strokeOpacity: lifecycle * opacityScale,
    };
  });

  return (
    <AnimatedPath
      d={pathData}
      stroke={`url(#${GRADIENT_ID})`}
      strokeWidth={strokeWidth}
      strokeDasharray={`${trailLength} ${gap}`}
      fill="none"
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
};

interface AnimatedGradientBorderProps {
  dimensions: { width: number; height: number } | null;
  /** When true the sweep animation fires once. */
  shouldAnimate: boolean;
}

/**
 * Animated border that sweeps clockwise around a rounded card once,
 * fading in at the start and fading out at the end.
 * A wider translucent glow layer underneath simulates a 10px layer blur.
 */
const AnimatedGradientBorder: React.FC<AnimatedGradientBorderProps> = ({
  dimensions,
  shouldAnimate,
}) => {
  const progress = useSharedValue(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!dimensions || !shouldAnimate || hasAnimated.current) return;
    hasAnimated.current = true;

    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: BORDER_SWEEP_DURATION_MS,
          easing: Easing.linear,
        }),
        withDelay(1500, withTiming(0, { duration: 0 })),
      ),
      2,
    );

    return () => {
      cancelAnimation(progress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, shouldAnimate]);

  if (!dimensions) {
    return null;
  }

  const { width, height } = dimensions;
  const perimeter = calcPerimeter(
    width,
    height,
    BORDER_RADIUS,
    BORDER_STROKE_WIDTH,
  );
  const pathData = buildRoundedRectPath(
    width,
    height,
    BORDER_RADIUS,
    BORDER_STROKE_WIDTH,
  );

  return (
    <Svg width={width} height={height} style={styles.svg} pointerEvents="none">
      <Defs>
        <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BORDER_GRADIENT_COLORS[0]} />
          <Stop offset="1" stopColor={BORDER_GRADIENT_COLORS[1]} />
        </LinearGradient>
      </Defs>

      <SweepPath
        pathData={pathData}
        perimeter={perimeter}
        progress={progress}
        strokeWidth={BORDER_STROKE_WIDTH}
        opacityScale={1}
      />
    </Svg>
  );
};

export { AnimatedGradientBorder };
export type { AnimatedGradientBorderProps };
