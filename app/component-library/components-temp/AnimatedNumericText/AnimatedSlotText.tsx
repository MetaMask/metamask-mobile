import React, { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated';
import {
  FontFamily,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { splitNumericString } from './splitNumericString';

export interface AnimatedSlotTextProps {
  /** Already-formatted value, for example `$1,234.56` or `+$3K`. */
  value: string;
  /**
   * Design-system text color. Stays constant while the digits roll.
   */
  color?: TextColor;
  /**
   * Design-system text variant.
   */
  variant?: TextVariant;
  /**
   * Design-system face. Hero always uses the bold cut.
   */
  fontFamily?: FontFamily;
  /**
   * Design-system weight. Ignored when `fontFamily` is Hero.
   */
  fontWeight?: FontWeight;
  /**
   * When false, or when the system reduced-motion setting is on, the value
   * swaps with no roll.
   */
  animated?: boolean;
  /**
   * Clips the numeric row. Leave this off unless a parent is measuring the
   * row and needs the reel hidden while it settles.
   */
  clipToBounds?: boolean;
  accessible?: boolean;
  testID?: string;
}

const ROLL_SPRING: WithSpringConfig = {
  duration: 400,
  dampingRatio: 1,
};
const STAGGER_MS = 20;
const REEL_LENGTH = 30;
const REEL_DIGITS = Array.from(
  { length: REEL_LENGTH },
  (_, index) => index % 10,
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  numeric: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  clip: {
    overflow: 'hidden',
  },
  frame: {
    overflow: 'hidden',
  },
  measurer: {
    opacity: 0,
  },
  reel: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});

type RollDirection = 1 | -1;

const rollDelta = (
  previous: number,
  next: number,
  direction: RollDirection,
): number => {
  if (direction > 0) {
    return next >= previous ? next - previous : 10 - previous + next;
  }

  return previous >= next ? -(previous - next) : -(10 - next + previous);
};

const readAmount = (numeric: string): number | undefined => {
  const normalized = numeric.replace(/[^\d.-]/g, '');
  if (normalized === '' || normalized === '-' || normalized === '.') {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const readLineHeight = (textStyle: TextStyle): number | undefined => {
  const lineHeight = StyleSheet.flatten(textStyle).lineHeight;
  return typeof lineHeight === 'number' && lineHeight > 0
    ? lineHeight
    : undefined;
};

interface DigitReelProps {
  digit: number;
  direction: RollDirection;
  delayMs: number;
  lineHeight: number;
  textStyle: TextStyle;
}

/**
 * One proportional column. Its width comes from the current glyph, not from
 * `0`, so a narrow digit keeps the font's own advance while the wheel rolls.
 */
const DigitReel = ({
  digit,
  direction,
  delayMs,
  lineHeight,
  textStyle,
}: DigitReelProps) => {
  const position = useSharedValue(digit + 10);
  const previousDigit = useRef(digit);
  const glyphStyle = useMemo(
    () => [textStyle, { height: lineHeight, lineHeight }],
    [lineHeight, textStyle],
  );
  const reelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -position.value * lineHeight }],
  }));

  useEffect(() => {
    if (previousDigit.current === digit) {
      return;
    }

    const delta = rollDelta(previousDigit.current, digit, direction);
    previousDigit.current = digit;

    let base = position.value;
    if (direction > 0 && base > 20) {
      base -= 10;
    } else if (direction < 0 && base < 9) {
      base += 10;
    }
    position.value = base;
    position.value = withDelay(delayMs, withSpring(base + delta, ROLL_SPRING));
  }, [delayMs, digit, direction, position]);

  return (
    <View collapsable={false} style={[styles.frame, { height: lineHeight }]}>
      <Text accessible={false} style={[glyphStyle, styles.measurer]}>
        {digit}
      </Text>
      <Animated.View style={[styles.reel, reelStyle]}>
        {REEL_DIGITS.map((reelDigit, index) => (
          <Text accessible={false} key={index} style={glyphStyle}>
            {reelDigit}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
};

/**
 * Rolls the numeric run with a Reanimated digit wheel. Signs, currency, and
 * spaced words stay still. Each digit column keeps that glyph's own width.
 * Callers that need a loading placeholder should wrap this rather than
 * adding that state here.
 */
const AnimatedSlotText = ({
  value,
  color = TextColor.TextDefault,
  variant = TextVariant.BodyMd,
  fontFamily = FontFamily.Default,
  fontWeight = FontWeight.Medium,
  animated,
  clipToBounds = false,
  accessible = true,
  testID,
}: AnimatedSlotTextProps) => {
  const tw = useTailwind();
  const reduceMotion = useReducedMotion();
  const previousNumeric = useRef<string | undefined>(undefined);
  const resolvedWeight =
    fontFamily === FontFamily.Hero ? FontWeight.Bold : fontWeight;
  const textStyle = tw.style(
    `text-${variant}`,
    `font-${fontFamily}-${resolvedWeight}`,
    color,
  ) as TextStyle;
  const lineHeight = readLineHeight(textStyle);
  const motionEnabled = animated !== false && !reduceMotion;
  const { prefix, numeric, suffix } = useMemo(
    () => splitNumericString(value),
    [value],
  );
  const previousAmount = readAmount(previousNumeric.current ?? '');
  const nextAmount = readAmount(numeric);
  const direction: RollDirection =
    previousAmount === undefined ||
    nextAmount === undefined ||
    nextAmount >= previousAmount
      ? 1
      : -1;

  if (previousNumeric.current !== numeric) {
    previousNumeric.current = numeric;
  }

  const renderStaticText = (content: string) => (
    <Text accessible={false} style={textStyle}>
      {content}
    </Text>
  );

  const renderNumeric = () => {
    if (!lineHeight) {
      return renderStaticText(numeric);
    }

    const characters = Array.from(numeric);
    const digitCount = characters.filter((character) =>
      /\d/u.test(character),
    ).length;
    let digitOrdinal = 0;

    return (
      <View style={[styles.numeric, clipToBounds ? styles.clip : null]}>
        {characters.map((character, index) => {
          const laneKey = `lane-${characters.length - 1 - index}`;

          if (!/\d/u.test(character)) {
            return (
              <Text accessible={false} key={laneKey} style={textStyle}>
                {character}
              </Text>
            );
          }

          const delayMs = (digitCount - 1 - digitOrdinal) * STAGGER_MS;
          digitOrdinal += 1;

          return (
            <DigitReel
              key={laneKey}
              delayMs={delayMs}
              digit={Number(character)}
              direction={direction}
              lineHeight={lineHeight}
              textStyle={textStyle}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'text' : undefined}
      accessibilityLabel={accessible ? value : undefined}
      style={styles.container}
      testID={testID}
    >
      {!motionEnabled || !numeric ? (
        renderStaticText(value)
      ) : (
        <>
          {prefix ? renderStaticText(prefix) : null}
          {renderNumeric()}
          {suffix ? renderStaticText(suffix) : null}
        </>
      )}
    </View>
  );
};

AnimatedSlotText.displayName = 'AnimatedSlotText';

export default memo(AnimatedSlotText);
