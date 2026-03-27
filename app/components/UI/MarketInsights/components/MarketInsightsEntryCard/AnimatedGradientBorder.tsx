import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import {
  BORDER_DASH_START_SHIFT_FRACTION,
  BORDER_GRADIENT_HEAD,
  BORDER_GRADIENT_TAIL,
  BORDER_RADIUS,
  BORDER_STROKE_WIDTH,
  BORDER_SWEEP_DURATION_MS,
  BORDER_SWEEP_PATH_END_FRACTION,
  BORDER_SWEEP_PATH_START_FRACTION,
  BORDER_TRAIL_ELASTIC_END_RATIO,
  BORDER_TRAIL_FRACTION,
} from './AnimatedGradientBorder.constants';
import {
  buildOpenBorderPathD,
  buildRoundedRectBorderPolyline,
  pointAtLengthOnBorderPolyline,
  type BorderPolylineSamples,
} from './roundedRectBorderPolyline';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const GRADIENT_ID = 'borderGradient';

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

interface SweepPathProps {
  poly: BorderPolylineSamples;
  pathData: string;
  progress: SharedValue<number>;
  strokeWidth: number;
  opacityScale: number;
}

const SweepPath: React.FC<SweepPathProps> = ({
  poly,
  pathData,
  progress,
  strokeWidth,
  opacityScale,
}) => {
  const xs = poly.xs as unknown as number[];
  const ys = poly.ys as unknown as number[];
  const cum = poly.cum as unknown as number[];
  const n = poly.n;
  const P = poly.perimeter;

  const frame = useDerivedValue(() => {
    'worklet';
    const p = progress.value;

    const trailPeak = P * BORDER_TRAIL_FRACTION;
    const trailMin = trailPeak * BORDER_TRAIL_ELASTIC_END_RATIO;
    const stretch = Math.sin(Math.PI * p);
    const trailLength = trailMin + (trailPeak - trailMin) * stretch;
    const gap = P - trailLength;

    const sweepT =
      BORDER_SWEEP_PATH_START_FRACTION +
      p * (BORDER_SWEEP_PATH_END_FRACTION - BORDER_SWEEP_PATH_START_FRACTION);
    const pathPhase = 1 - sweepT;
    const dashOffset = P * pathPhase + P * BORDER_DASH_START_SHIFT_FRACTION;

    let tailS = dashOffset % P;
    if (tailS < 0) {
      tailS += P;
    }
    tailS = (P - tailS) % P;
    if (tailS < 0) {
      tailS += P;
    }

    const tailPt = pointAtLengthOnBorderPolyline(tailS, xs, ys, cum, n, P);
    const headPt = pointAtLengthOnBorderPolyline(
      tailS + trailLength,
      xs,
      ys,
      cum,
      n,
      P,
    );

    const x1 = tailPt.x;
    const y1 = tailPt.y;
    let x2 = headPt.x;
    let y2 = headPt.y;
    if (Math.hypot(x2 - x1, y2 - y1) < 0.75) {
      const ahead = pointAtLengthOnBorderPolyline(
        tailS + Math.max(trailLength, 3),
        xs,
        ys,
        cum,
        n,
        P,
      );
      x2 = ahead.x;
      y2 = ahead.y;
    }

    const t = Math.min(Math.max(p, 0), 1);
    let opacityEnvelope: number;
    if (t <= 0.5) {
      const u = 2 * t;
      opacityEnvelope = 1 - (1 - u) * (1 - u);
    } else {
      const v = 2 * (t - 0.5);
      opacityEnvelope = 1 - v * v * v;
    }

    return {
      strokeDasharray: `${trailLength},${gap}`,
      strokeDashoffset: dashOffset,
      strokeOpacity: opacityEnvelope * opacityScale,
      x1,
      y1,
      x2,
      y2,
    };
  });

  const pathAnimatedProps = useAnimatedProps(() => {
    const f = frame.value;
    return {
      strokeDasharray: f.strokeDasharray,
      strokeDashoffset: f.strokeDashoffset,
      strokeOpacity: f.strokeOpacity,
    };
  });

  const gradientAnimatedProps = useAnimatedProps(() => {
    const f = frame.value;
    return {
      x1: f.x1,
      y1: f.y1,
      x2: f.x2,
      y2: f.y2,
    };
  });

  return (
    <>
      <Defs>
        <AnimatedLinearGradient
          id={GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          animatedProps={gradientAnimatedProps}
        >
          <Stop offset="0" stopColor={BORDER_GRADIENT_TAIL} />
          <Stop offset="1" stopColor={BORDER_GRADIENT_HEAD} />
        </AnimatedLinearGradient>
      </Defs>
      <AnimatedPath
        d={pathData}
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        animatedProps={pathAnimatedProps}
      />
    </>
  );
};

interface AnimatedGradientBorderProps {
  dimensions: { width: number; height: number } | null;
  /** Increment this value to trigger a new animation sweep. 0 = no animation. */
  animationKey: number;
}

/**
 * Dashed stroke sweep; linear gradient is anchored tail → head in user space
 * so the trail reads pink at the tail and coral at the head.
 * Re-fires every time `animationKey` is incremented.
 */
const AnimatedGradientBorder: React.FC<AnimatedGradientBorderProps> = ({
  dimensions,
  animationKey,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!dimensions || animationKey === 0) return;

    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withSequence(
      withTiming(1, {
        duration: BORDER_SWEEP_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      withDelay(1500, withTiming(0, { duration: 0 })),
    );

    return () => {
      cancelAnimation(progress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, animationKey]);

  const pathSpec = useMemo(() => {
    if (!dimensions) {
      return null;
    }
    const { width, height } = dimensions;
    const poly = buildRoundedRectBorderPolyline(
      width,
      height,
      BORDER_RADIUS,
      BORDER_STROKE_WIDTH,
    );
    return {
      poly,
      pathData: buildOpenBorderPathD(poly),
    };
  }, [dimensions]);

  if (!dimensions || !pathSpec) {
    return null;
  }

  const { width, height } = dimensions;

  return (
    <Svg width={width} height={height} style={styles.svg} pointerEvents="none">
      <SweepPath
        poly={pathSpec.poly}
        pathData={pathSpec.pathData}
        progress={progress}
        strokeWidth={BORDER_STROKE_WIDTH}
        opacityScale={1}
      />
    </Svg>
  );
};

export { AnimatedGradientBorder };
export type { AnimatedGradientBorderProps };
