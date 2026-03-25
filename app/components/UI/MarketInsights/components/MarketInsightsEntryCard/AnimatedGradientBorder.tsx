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
  BORDER_GLOW_OPACITY,
  BORDER_GLOW_STROKE_WIDTH,
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
 * Rounded rectangle path starting at the bottom-left corner,
 * tracing clockwise: left↑ → top→ → right↓ → bottom← → back to start.
 * Intentionally NOT closed with Z so the dash pattern begins exactly
 * at the bottom-left starting point.
 */
function buildRoundedRectPath(
  width: number,
  height: number,
  r: number,
): string {
  return [
    `M 0 ${height - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    `H ${width - r}`,
    `A ${r} ${r} 0 0 1 ${width} ${r}`,
    `V ${height - r}`,
    `A ${r} ${r} 0 0 1 ${width - r} ${height}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${height - r}`,
  ].join(' ');
}

function calcPerimeter(width: number, height: number, r: number): number {
  return 2 * (width - 2 * r) + 2 * (height - 2 * r) + 2 * Math.PI * r;
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
    // Shift the dash backward so the visible segment is at the
    // bottom-left when the fade-in reaches the midpoint.
    const startShift = perimeter * BORDER_FADE_IN_FRACTION * 0.5;
    const dashOffset = perimeter * (1 - p) + startShift;

    let lifecycle = 1;
    if (p < BORDER_FADE_IN_FRACTION) {
      lifecycle = p / BORDER_FADE_IN_FRACTION;
    } else if (p > 1 - BORDER_FADE_OUT_FRACTION) {
      lifecycle = (1 - p) / BORDER_FADE_OUT_FRACTION;
    }

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
  const perimeter = calcPerimeter(width, height, BORDER_RADIUS);
  const pathData = buildRoundedRectPath(width, height, BORDER_RADIUS);

  return (
    <Svg width={width} height={height} style={styles.svg} pointerEvents="none">
      <Defs>
        <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BORDER_GRADIENT_COLORS[0]} />
          <Stop offset="0.5" stopColor={BORDER_GRADIENT_COLORS[1]} />
          <Stop offset="1" stopColor={BORDER_GRADIENT_COLORS[2]} />
        </LinearGradient>
      </Defs>

      {/* Soft glow layer (simulates 10px layer blur) */}
      <SweepPath
        pathData={pathData}
        perimeter={perimeter}
        progress={progress}
        strokeWidth={BORDER_GLOW_STROKE_WIDTH}
        opacityScale={BORDER_GLOW_OPACITY}
      />

      {/* Sharp main stroke */}
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
