import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import {
  Box,
  FontFamily,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { usePrototypeMotion } from './usePrototypeMotion';

type RollDirection = 'up' | 'down';

/** One digit's roll. Quick enough to stay in the background of a 1s tick. */
const ROLL_MS = 320;
/** How far a digit travels, as a share of its height. A nudge, not a full odometer turn. */
const TRAVEL = 0.4;

const styles = StyleSheet.create({
  /** Equal-width digits, so a changing digit never shifts its neighbours. */
  digit: { fontVariant: ['tabular-nums'] },
  slot: { overflow: 'hidden' },
  hidden: { opacity: 0 },
  reel: { position: 'absolute', left: 0, top: 0 },
});

interface GlyphProps {
  variant: TextVariant;
  fontWeight: FontWeight;
  fontFamily: FontFamily;
  color: TextColor;
}

/**
 * Numeric reading of a formatted string, to decide which way digits roll.
 * Separators are dropped, so `02:19` reads as 219 and counts down as it should.
 */
export const readNumber = (value: string) => {
  const digits = value.replace(/[^\d.]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

const Digit = ({
  digit,
  direction,
  isAnimated,
  glyph,
}: {
  digit: string;
  direction: RollDirection;
  isAnimated: boolean;
  glyph: GlyphProps;
}) => {
  const [height, setHeight] = useState(0);
  const [roll, setRoll] = useState<{
    from: string;
    direction: RollDirection;
  } | null>(null);
  const shown = useRef(digit);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (shown.current === digit) return;
    const from = shown.current;
    shown.current = digit;
    if (!isAnimated || height === 0) {
      setRoll(null);
      return;
    }
    setRoll({ from, direction });
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: ROLL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRoll(null);
    });
    // Only a new digit starts a roll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digit]);

  const text = (value: string) => (
    <Text {...glyph} style={styles.digit}>
      {value}
    </Text>
  );

  // Up: the old digit lifts away while the new one rises in from just below.
  // Down: the old digit sinks while the new one drops in from just above.
  // Both crossfade, so the change reads as motion without a hard scroll.
  const travel = height * TRAVEL * (roll?.direction === 'down' ? -1 : 1);
  const leaveY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -travel],
  });
  const enterY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [travel, 0],
  });
  const leaveOpacity = progress.interpolate({
    inputRange: [0, 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const enterOpacity = progress.interpolate({
    inputRange: [0.2, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.slot}>
      <Text
        {...glyph}
        style={[styles.digit, roll ? styles.hidden : null]}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        {digit}
      </Text>
      {roll ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.reel,
              { opacity: leaveOpacity, transform: [{ translateY: leaveY }] },
            ]}
          >
            {text(roll.from)}
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.reel,
              { opacity: enterOpacity, transform: [{ translateY: enterY }] },
            ]}
          >
            {text(digit)}
          </Animated.View>
        </>
      ) : null}
    </View>
  );
};

/**
 * A formatted number whose changed digits nudge and crossfade: a rising value
 * lifts them upward, a falling one sinks them down. Separators,
 * signs and units stay still. The roll is plain `Animated` on the native
 * driver, so it needs no native module.
 */
export const RollingNumber = ({
  value,
  variant = TextVariant.BodyMd,
  fontWeight = FontWeight.Regular,
  fontFamily = FontFamily.Default,
  color = TextColor.TextDefault,
  animated = true,
  testID,
}: {
  value: string;
  variant?: TextVariant;
  fontWeight?: FontWeight;
  fontFamily?: FontFamily;
  color?: TextColor;
  /** Off for values that are not live, such as an upcoming game's start time. */
  animated?: boolean;
  testID?: string;
}) => {
  const { shouldAnimate } = usePrototypeMotion();
  const previous = useRef(readNumber(value));
  const direction: RollDirection =
    readNumber(value) >= previous.current ? 'up' : 'down';
  useEffect(() => {
    previous.current = readNumber(value);
  }, [value]);

  const glyph: GlyphProps = { variant, fontWeight, fontFamily, color };
  const chars = Array.from(value);
  return (
    <Box
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={value}
      twClassName="flex-row items-center"
    >
      {chars.map((char, index) => {
        // Keyed from the right, so the ones place keeps its identity as the
        // number grows a digit on the left.
        const key = chars.length - index;
        return /\d/.test(char) ? (
          <Digit
            key={key}
            digit={char}
            direction={direction}
            isAnimated={animated && shouldAnimate}
            glyph={glyph}
          />
        ) : (
          <Text key={key} {...glyph} style={styles.digit}>
            {char}
          </Text>
        );
      })}
    </Box>
  );
};
