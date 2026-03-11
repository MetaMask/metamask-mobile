import React, { memo, useEffect, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const VIEWBOX_WIDTH = 1920;
const VIEWBOX_HEIGHT = 1080;
const BACKGROUND_SCALE = 1.15;
const SCALED_VIEWBOX_WIDTH = VIEWBOX_WIDTH / BACKGROUND_SCALE;
const SCALED_VIEWBOX_HEIGHT = VIEWBOX_HEIGHT / BACKGROUND_SCALE;
const VIEWBOX_X = (VIEWBOX_WIDTH - SCALED_VIEWBOX_WIDTH) / 2;
const VIEWBOX_Y = 0;
const PULSE_PEAK_BOOST = 0.7;
const STAR_PATH =
  'M20.5 0 C22.8 8.8 24.8 16.2 27.1 17.3 C29.6 18.4 37.2 18.5 41 20.5 C37.2 22.5 29.6 22.6 27.1 23.7 C24.8 24.8 22.8 32.2 20.5 41 C18.2 32.2 16.2 24.8 13.9 23.7 C11.4 22.6 3.8 22.5 0 20.5 C3.8 18.5 11.4 18.4 13.9 17.3 C16.2 16.2 18.2 8.8 20.5 0Z';
const STAR_FILL = 'rgb(170, 170, 170)';
const AnimatedPath = Animated.createAnimatedComponent(Path);

const GRID_STEP = 45;
const GRID_X_START = -28;
const GRID_X_END = 1907;
const GRID_Y_START = 2;
const GRID_Y_END = 1037;

const STAR_POSITIONS: readonly (readonly [number, number])[] = (() => {
  const positions: [number, number][] = [];
  for (let y = GRID_Y_START; y <= GRID_Y_END; y += GRID_STEP) {
    for (let x = GRID_X_START; x <= GRID_X_END; x += GRID_STEP) {
      positions.push([x, y]);
    }
  }
  return positions;
})();

const BASE_OPACITY_MIN = 0.005;
const BASE_OPACITY_RANGE = 0.1;
const MORPH_CYCLE_MS = 30000;

interface StarProps {
  x: number;
  y: number;
  time: SharedValue<number>;
  pulseToken: number;
}

const Star = memo(({ x, y, time, pulseToken }: StarProps) => {
  const pulseProgress = useSharedValue(0);

  useEffect(() => {
    if (pulseToken === 0) {
      return;
    }

    pulseProgress.value = 0;
    pulseProgress.value = withSequence(
      withTiming(1, {
        duration: 380,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(0, {
        duration: 700,
        easing: Easing.inOut(Easing.quad),
      }),
    );
  }, [pulseProgress, pulseToken]);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const t = time.value;
    const nx = x / VIEWBOX_WIDTH;
    const ny = y / VIEWBOX_HEIGHT;

    const wave1 = Math.sin(nx * 6 + t) * Math.cos(ny * 4 + t * 0.7);
    const wave2 = Math.sin(nx * 3 - t * 0.5 + ny * 5);
    const wave3 = Math.cos(nx * 8 + ny * 3 + t * 1.3);

    const combined = (wave1 + wave2 + wave3) / 3;
    const baseOpacity = BASE_OPACITY_MIN + (combined + 1) * BASE_OPACITY_RANGE;

    return {
      opacity: Math.min(
        baseOpacity + pulseProgress.value * PULSE_PEAK_BOOST,
        1,
      ),
    };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      d={STAR_PATH}
      fill={STAR_FILL}
      transform={`translate(${x} ${y})`}
    />
  );
});

Star.displayName = 'Star';

interface AlternateBackgroundAnimationProps {
  testID?: string;
}

const AlternateBackgroundAnimation = ({
  testID,
}: AlternateBackgroundAnimationProps) => {
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: MORPH_CYCLE_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [time]);

  const [pulseTokens, setPulseTokens] = useState<number[]>(() =>
    Array.from({ length: STAR_POSITIONS.length }, () => 0),
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const scheduleNextFrame = () => {
      const nextDelay = 360 + Math.floor(Math.random() * 900);
      timeoutId = setTimeout(() => {
        if (!isMounted) return;

        setPulseTokens((previousPulseTokens) => {
          const nextPulseTokens = [...previousPulseTokens];
          const starsToPulse = 2 + Math.floor(Math.random() * 7);

          for (let i = 0; i < starsToPulse; i += 1) {
            const starIndex = Math.floor(Math.random() * STAR_POSITIONS.length);
            nextPulseTokens[starIndex] += 1;
          }

          return nextPulseTokens;
        });

        scheduleNextFrame();
      }, nextDelay);
    };

    scheduleNextFrame();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`${VIEWBOX_X} ${VIEWBOX_Y} ${SCALED_VIEWBOX_WIDTH} ${SCALED_VIEWBOX_HEIGHT}`}
      fill="none"
      preserveAspectRatio="xMidYMin slice"
      testID={testID}
    >
      {STAR_POSITIONS.map(([x, y], index) => (
        <Star
          key={`${x}-${y}`}
          x={x}
          y={y}
          time={time}
          pulseToken={pulseTokens[index]}
        />
      ))}
    </Svg>
  );
};

export default AlternateBackgroundAnimation;
