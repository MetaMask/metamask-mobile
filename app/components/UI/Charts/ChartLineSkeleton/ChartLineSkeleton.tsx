import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Box } from '@metamask/design-system-react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { hasTestOverrides } from '../../../../util/test/utils';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useTheme } from '../../../../util/theme';
import type { ChartLineSkeletonProps } from './ChartLineSkeleton.types';

/** Same right inset as PriceChart's end dot (radius 8 + 8px) so the marker does not jump. */
const END_DOT_RADIUS = 8;
const END_DOT_INSET = END_DOT_RADIUS + 8;
/** Matches the page's 16px side gutter so the line does not run to the screen edge. */
const START_INSET = 16;
const STROKE_WIDTH = 2;

/** Same opacity range and step as the design-system Skeleton pulse. */
const PULSE_MAX_OPACITY = 0.2;
const PULSE_MIN_OPACITY = 0.1;
const PULSE_STEP_MS = 700;
/** Jest and E2E builds keep the pulse still, like the design-system Skeleton wrapper. */
const PULSE_AUTO_PLAY = !hasTestOverrides && !process.env.JEST_WORKER_ID;

/**
 * Decorative wave in 0..1 (y grows downward), ending high on the right — a
 * placeholder, not the token's price series.
 */
const WAVE: readonly (readonly [number, number])[] = [
  [0, 0.46],
  [0.08, 0.4],
  [0.16, 0.45],
  [0.26, 0.54],
  [0.36, 0.42],
  [0.46, 0.34],
  [0.55, 0.39],
  [0.64, 0.31],
  [0.74, 0.4],
  [0.84, 0.48],
  [0.93, 0.36],
  [1, 0.3],
];

interface Point {
  x: number;
  y: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const toPath = (points: readonly Point[]): string => {
  const first = points[0];
  if (!first || points.length < 2) {
    return '';
  }

  let path = `M${round2(first.x)} ${round2(first.y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) {
      continue;
    }
    const c1x = round2(p1.x + (p2.x - p0.x) / 6);
    const c1y = round2(p1.y + (p2.y - p0.y) / 6);
    const c2x = round2(p2.x - (p3.x - p1.x) / 6);
    const c2y = round2(p2.y - (p3.y - p1.y) / 6);
    path += ` C${c1x} ${c1y} ${c2x} ${c2y} ${round2(p2.x)} ${round2(p2.y)}`;
  }
  return path;
};

const lineGeometry = (width: number, height: number) => {
  const plotWidth = Math.max(width - START_INSET - END_DOT_INSET, 1);
  const points = WAVE.map(([x, y]) => ({
    x: START_INSET + x * plotWidth,
    y: y * height,
  }));
  const end = points[points.length - 1];

  return {
    d: toPath(points),
    endX: end ? round2(end.x) : 0,
    endY: end ? round2(end.y) : 0,
  };
};

/** Line-chart placeholder. Same box as the loaded chart: inset wave plus end dot. */
const ChartLineSkeleton = ({
  height,
  testID = 'chart-line-skeleton',
}: ChartLineSkeletonProps) => {
  const { colors } = useTheme();
  const prefersReducedMotion = useReducedMotion() === true;
  const [hardwareCanAnimate] = useState(() => getHardwareTier() !== 'LOW');
  const canAnimate = hardwareCanAnimate && !prefersReducedMotion;
  const [width, setWidth] = useState(() => Dimensions.get('window').width);
  const opacity = useRef(new Animated.Value(PULSE_MAX_OPACITY)).current;
  const geometry = useMemo(() => lineGeometry(width, height), [width, height]);

  useEffect(() => {
    if (!canAnimate || !PULSE_AUTO_PLAY) {
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PULSE_MIN_OPACITY,
          duration: PULSE_STEP_MS,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: PULSE_MAX_OPACITY,
          duration: PULSE_STEP_MS,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [canAnimate, opacity]);

  return (
    <Box
      testID={testID}
      twClassName="w-full overflow-hidden"
      style={{ height }}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0) {
          setWidth((current) => (current === next ? current : next));
        }
      }}
    >
      <Animated.View
        testID={canAnimate ? `${testID}-pulse` : `${testID}-static`}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity }]}
      >
        <Svg width={width} height={height}>
          <Path
            testID={`${testID}-line`}
            d={geometry.d}
            stroke={colors.icon.alternative}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Circle
            testID={`${testID}-end`}
            cx={geometry.endX}
            cy={geometry.endY}
            r={END_DOT_RADIUS}
            fill={colors.icon.alternative}
          />
        </Svg>
      </Animated.View>
    </Box>
  );
};

export default ChartLineSkeleton;
