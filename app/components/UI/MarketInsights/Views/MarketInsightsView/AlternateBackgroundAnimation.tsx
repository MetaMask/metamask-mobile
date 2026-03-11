import React, { memo, useEffect, useMemo } from 'react';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

const COMP_WIDTH = 393;
const COMP_HEIGHT = 170;
// Reuse the existing star asset and scale it down so each glyph fits the
// footprint that used to belong to one circle in the original version.
const STAR_PATH =
  'M20.5 0 C22.8 8.8 24.8 16.2 27.1 17.3 C29.6 18.4 37.2 18.5 41 20.5 C37.2 22.5 29.6 22.6 27.1 23.7 C24.8 24.8 22.8 32.2 20.5 41 C18.2 32.2 16.2 24.8 13.9 23.7 C11.4 22.6 3.8 22.5 0 20.5 C3.8 18.5 11.4 18.4 13.9 17.3 C16.2 16.2 18.2 8.8 20.5 0Z';
const STAR_VIEWBOX_SIZE = 41;

const CELL_SIZE = 13;
const DOT_RADIUS = 4.1;
const DOT_DIAMETER = DOT_RADIUS * 2;
const STAR_SCALE = DOT_DIAMETER / STAR_VIEWBOX_SIZE;
// The missing Low_Poly_01 mask is approximated with an ellipse, so stars are
// only generated inside this area rather than across the full canvas.
const SILHOUETTE_CENTER_X = COMP_WIDTH * 0.5;
const SILHOUETTE_CENTER_Y = COMP_HEIGHT * 0.5;
const SILHOUETTE_RADIUS_X = COMP_WIDTH * 0.44;
const SILHOUETTE_RADIUS_Y = COMP_HEIGHT * 0.42;

// The sweep starts and ends off-screen so the highlight can fully enter and
// leave the composition without clipping at the card edges.
const SWEEP_START_X = -COMP_WIDTH * 0.6;
const SWEEP_END_X = COMP_WIDTH * 1.65;
const SWEEP_FALLOFF_HALF_WIDTH = 100;
const LOOP_DURATION_MS = 1600;
const SHIMMER_DURATION_MS = 4000;
// Keep this as a whole number so the twinkle loop begins and ends on the same
// phase, which avoids a visible "pop" when it repeats.
const NOISE_CYCLES_PER_LOOP = 2;

interface Dot {
  x: number;
  y: number;
}

interface Column {
  colX: number;
  dots: Dot[];
}

interface AnimatedColumnProps {
  colX: number;
  dots: Dot[];
  sweepX: SharedValue<number>;
  tick: SharedValue<number>;
}

/**
 * Approximates the missing Low_Poly_01 silhouette as an ellipse so the
 * reference column sweep animation can ship without the source polygon file.
 */
function buildColumns(): Column[] {
  const columns: Column[] = [];

  for (
    let gridX = CELL_SIZE / 2;
    gridX <= COMP_WIDTH + CELL_SIZE;
    gridX += CELL_SIZE
  ) {
    const dots: Dot[] = [];

    for (
      let gridY = CELL_SIZE / 2;
      gridY <= COMP_HEIGHT + CELL_SIZE;
      gridY += CELL_SIZE
    ) {
      // Convert the point into normalized ellipse space and keep only the
      // samples that fall inside the silhouette.
      const normalizedX = (gridX - SILHOUETTE_CENTER_X) / SILHOUETTE_RADIUS_X;
      const normalizedY = (gridY - SILHOUETTE_CENTER_Y) / SILHOUETTE_RADIUS_Y;

      if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
        dots.push({ x: gridX, y: gridY });
      }
    }

    if (dots.length > 0) {
      columns.push({ colX: gridX, dots });
    }
  }

  return columns;
}

const AnimatedColumn = memo(
  ({ colX, dots, sweepX, tick }: AnimatedColumnProps) => {
    const animatedProps = useAnimatedProps(() => {
      'worklet';

      const distance = Math.abs(colX - sweepX.value);
      // This is the large one-off highlight. Columns closest to the moving
      // sweep position get the strongest opacity boost.
      const falloff = Math.max(0, 1 - distance / SWEEP_FALLOFF_HALF_WIDTH);
      // This is the subtle continuous shimmer that remains after the sweep
      // passes. A column-specific phase offset keeps adjacent columns from
      // twinkling in perfect sync.
      const noise =
        (Math.sin(
          tick.value * Math.PI * 2 * NOISE_CYCLES_PER_LOOP + colX * 0.09,
        ) +
          1) *
        0.5;
      // Final opacity = low resting brightness + slow shimmer + moving sweep.
      const opacity = Math.min(0.92, 0.08 + noise * 0.14 + falloff * 0.7);

      return { opacity };
    });

    return (
      <AnimatedG animatedProps={animatedProps}>
        {dots.map((dot) => (
          <Path
            key={`${dot.x}-${dot.y}`}
            d={STAR_PATH}
            fill="rgb(255, 255, 255)"
            transform={`translate(${dot.x - DOT_RADIUS} ${dot.y - DOT_RADIUS}) scale(${STAR_SCALE})`}
          />
        ))}
      </AnimatedG>
    );
  },
);

AnimatedColumn.displayName = 'AnimatedColumn';

interface AlternateBackgroundAnimationProps {
  testID?: string;
}

const AlternateBackgroundAnimation = ({
  testID,
}: AlternateBackgroundAnimationProps) => {
  // The star layout is static, so build it once and only animate opacity.
  const columns = useMemo(() => buildColumns(), []);
  const sweepX = useSharedValue(SWEEP_START_X);
  const tick = useSharedValue(0);

  useEffect(() => {
    // One large left-to-right pass that plays once when the component mounts.
    sweepX.value = withTiming(SWEEP_END_X, {
      duration: LOOP_DURATION_MS,
      easing: Easing.linear,
    });

    return () => {
      cancelAnimation(sweepX);
    };
  }, [sweepX]);

  useEffect(() => {
    // Continuous shimmer loop used by the noise term in each column.
    tick.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(tick);
    };
  }, [tick]);

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${COMP_WIDTH} ${COMP_HEIGHT}`}
      fill="none"
      preserveAspectRatio="xMidYMin slice"
      testID={testID}
    >
      {/* Each AnimatedColumn shares one opacity value, which keeps the effect
          cheaper than animating every star independently. */}
      {columns.map(({ colX, dots }) => (
        <AnimatedColumn
          key={colX}
          colX={colX}
          dots={dots}
          sweepX={sweepX}
          tick={tick}
        />
      ))}
    </Svg>
  );
};

export default AlternateBackgroundAnimation;
