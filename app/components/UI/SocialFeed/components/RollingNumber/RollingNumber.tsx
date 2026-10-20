import {
  Text,
  type FontWeight,
  type TextVariant,
} from '@metamask/design-system-react-native';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  useReducedMotion as useNativeReducedMotion,
} from 'react-native-reanimated';

export type RollingNumberTrend = 'up' | 'down';

export interface RollingNumberProps {
  /** Already-formatted value (`$1,234.56`, `+12.40%`). */
  value: string;
  /**
   * Which way the latest change went. Digits roll in from below on `up` and
   * from above on `down`, and the text briefly takes that tone.
   */
  trend?: RollingNumberTrend | null;
  /** Swap values instantly, keeping only the tint. */
  reduceMotion?: boolean;
  variant?: TextVariant;
  fontWeight?: FontWeight;
  /** Resting text classes, e.g. a color. Replaced by the tint while it shows. */
  twClassName?: string;
  testID?: string;
}

const useReducedMotion = useNativeReducedMotion ?? (() => false);

const ROLL_DURATION_MS = 260;
export const ROLLING_NUMBER_TINT_MS = 700;
const ROLL_EASING = Easing.out(Easing.cubic);

const ENTER_FROM_BELOW =
  FadeInUp.duration(ROLL_DURATION_MS).easing(ROLL_EASING);
const EXIT_UPWARD = FadeOutUp.duration(ROLL_DURATION_MS).easing(ROLL_EASING);
const ENTER_FROM_ABOVE =
  FadeInDown.duration(ROLL_DURATION_MS).easing(ROLL_EASING);
const EXIT_DOWNWARD =
  FadeOutDown.duration(ROLL_DURATION_MS).easing(ROLL_EASING);

const TINT_CLASS: Record<RollingNumberTrend, string> = {
  up: 'text-success-default',
  down: 'text-error-default',
};

const AnimatedText = Animated.createAnimatedComponent(Text);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  slot: { overflow: 'hidden' },
  glyph: { fontVariant: ['tabular-nums'] },
});

export interface RollingGlyph {
  /** Stable per position, counted from the right so decimals stay aligned. */
  slotKey: string;
  character: string;
}

/**
 * Splits a value into glyphs keyed by their distance from the right edge, so
 * `$9.99` -> `$10.01` keeps the cents slots mounted and only rolls the digits
 * that changed.
 */
export const getRollingGlyphs = (value: string): RollingGlyph[] => {
  const characters = Array.from(value);
  return characters.map((character, index) => ({
    slotKey: `slot-${characters.length - 1 - index}`,
    character,
  }));
};

/**
 * Formatted number whose changed digits roll vertically, like a slot reel.
 * Unchanged digits stay put; the first render and reduced motion swap
 * instantly, though a change still flashes the trend tint.
 */
const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  trend = null,
  reduceMotion = false,
  variant,
  fontWeight,
  twClassName,
  testID,
}) => {
  const systemReducedMotion = useReducedMotion();
  const motionEnabled = !reduceMotion && !systemReducedMotion;
  const [hasRendered, setHasRendered] = useState(false);
  const [shown, setShown] = useState<{
    value: string;
    trend?: RollingNumberTrend | null;
  }>({ value });
  const shownValue = shown.value;
  // A glyph's exit animation is read from the props it last rendered with, so
  // a direction change is committed one render before the value it applies to.
  const [rollTrend, setRollTrend] = useState<RollingNumberTrend>(trend ?? 'up');
  const [tint, setTint] = useState<RollingNumberTrend | null>(null);

  useEffect(() => {
    setHasRendered(true);
  }, []);

  useEffect(() => {
    if (value === shownValue) {
      return;
    }
    if (motionEnabled && trend && trend !== rollTrend) {
      setRollTrend(trend);
      return;
    }
    setShown({ value, trend });
  }, [motionEnabled, rollTrend, shownValue, trend, value]);

  useEffect(() => {
    if (!shown.trend) {
      return undefined;
    }
    setTint(shown.trend);
    const timeout = setTimeout(() => setTint(null), ROLLING_NUMBER_TINT_MS);
    return () => clearTimeout(timeout);
  }, [shown]);

  const glyphs = useMemo(() => getRollingGlyphs(shownValue), [shownValue]);
  const textClassName = tint ? TINT_CLASS[tint] : twClassName;
  const animate = motionEnabled && hasRendered;
  const entering = rollTrend === 'down' ? ENTER_FROM_ABOVE : ENTER_FROM_BELOW;
  const exiting = rollTrend === 'down' ? EXIT_DOWNWARD : EXIT_UPWARD;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={shownValue}
      testID={testID}
    >
      {glyphs.map(({ slotKey, character }) => (
        <View key={slotKey} style={styles.slot}>
          <AnimatedText
            key={character}
            accessible={false}
            variant={variant}
            fontWeight={fontWeight}
            twClassName={textClassName}
            style={styles.glyph}
            entering={animate ? entering : undefined}
            exiting={animate ? exiting : undefined}
          >
            {character}
          </AnimatedText>
        </View>
      ))}
    </View>
  );
};

export default memo(RollingNumber);
