import React, { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { CashbackPanelSelectors } from './CashbackPanel.testIds';

const COIN_COUNT = 24;
/** Coin edge in pt; matches w-8 / h-8 on the coin image. */
const COIN_SIZE = 32;
const RAIN_DURATION_MS = 2200;
/** Share of the timeline used for staggered starts; each coin falls in the rest. */
const STAGGER_SHARE = 0.45;
/** `onClearing` fires once this share of the coins has fallen off-screen. */
const CLEARED_COIN_SHARE = 0.75;

interface CoinDrop {
  /** Start x as a share of the view width (0–1). */
  x: number;
  /** Sideways drift in px over the fall. */
  drift: number;
  spin: number;
  delay: number;
  scale: number;
}

/**
 * Pseudo-random but deterministic, so every rain looks natural yet the same
 * each time (and tests stay stable).
 */
const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const buildDrops = (): CoinDrop[] =>
  Array.from({ length: COIN_COUNT }, (_, index) => ({
    // Spread evenly across the width, jittered so it doesn't look like a grid.
    x: (index + 0.15 + seeded(index, 1) * 0.7) / COIN_COUNT,
    drift: (seeded(index, 2) - 0.5) * 60,
    spin: (seeded(index, 3) - 0.5) * 540,
    delay: seeded(index, 4) * STAGGER_SHARE,
    scale: 0.7 + seeded(index, 5) * 0.5,
  }));

const Coin = ({
  drop,
  progress,
  width,
  height,
}: {
  drop: CoinDrop;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) => {
  const tw = useTailwind();
  const style = useAnimatedStyle(() => {
    const local = Math.min(
      1,
      Math.max(0, (progress.value - drop.delay) / (1 - STAGGER_SHARE)),
    );
    // Ease-in (accelerating) like gravity, from above the top to below the bottom.
    const fall = local * local;
    return {
      opacity: local === 0 ? 0 : 1,
      transform: [
        { translateX: drop.x * width - COIN_SIZE / 2 + drop.drift * local },
        { translateY: -COIN_SIZE + fall * (height + COIN_SIZE * 2) },
        { rotate: `${drop.spin * local}deg` },
        { scale: drop.scale },
      ],
    };
  });

  return (
    <Animated.Image
      source={MUSD_TOKEN.imageSource}
      style={[tw.style('absolute left-0 top-0 w-8 h-8'), style]}
    />
  );
};

interface CashbackCoinRainProps {
  /** Called once the last coin has fallen (or straight away under Reduce Motion). */
  onComplete: () => void;
  /**
   * Called once most coins have fallen off-screen (see CLEARED_COIN_SHARE),
   * a little before `onComplete`, or straight away under Reduce Motion.
   */
  onClearing?: () => void;
}

/** Milliseconds into the rain when CLEARED_COIN_SHARE of the coins are gone. */
export const getCoinRainClearingMs = (drops: CoinDrop[]): number => {
  const exits = drops
    .map((drop) => drop.delay + (1 - STAGGER_SHARE))
    .sort((a, b) => a - b);
  const index = Math.min(
    exits.length - 1,
    Math.ceil(exits.length * CLEARED_COIN_SHARE) - 1,
  );
  return Math.round((exits[Math.max(0, index)] ?? 1) * RAIN_DURATION_MS);
};

/**
 * mUSD coins raining down across the whole view when a cashback payout lands.
 * Full-screen overlay that never takes touches.
 */
const CashbackCoinRain = ({
  onComplete,
  onClearing,
}: CashbackCoinRainProps) => {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const drops = useMemo(buildDrops, []);

  useEffect(() => {
    if (!onClearing) return undefined;
    if (reduceMotion) {
      onClearing();
      return undefined;
    }
    const timer = setTimeout(onClearing, getCoinRainClearingMs(drops));
    return () => clearTimeout(timer);
  }, [drops, onClearing, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      onComplete();
      return;
    }
    progress.value = withTiming(
      1,
      { duration: RAIN_DURATION_MS, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      },
    );
  }, [onComplete, progress, reduceMotion]);

  if (reduceMotion) {
    return null;
  }

  return (
    <Box
      pointerEvents="none"
      twClassName="absolute inset-0"
      testID={CashbackPanelSelectors.COIN_RAIN}
    >
      {drops.map((drop, index) => (
        <Coin
          key={index}
          drop={drop}
          progress={progress}
          width={width}
          height={height}
        />
      ))}
    </Box>
  );
};

export default CashbackCoinRain;
