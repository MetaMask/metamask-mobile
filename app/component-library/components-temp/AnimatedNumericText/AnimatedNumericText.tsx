import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useReducedMotion as useNativeReducedMotion,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import {
  FontWeight,
  Text as DesignSystemText,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { splitNumericString } from './splitNumericString';

const useReducedMotion = useNativeReducedMotion ?? (() => false);
const GLYPH_EASING = Easing.out(Easing.cubic);
const GLYPH_ENTER_TRANSITION = ZoomIn.duration(120).easing(GLYPH_EASING);
const GLYPH_EXIT_TRANSITION = ZoomOut.duration(90).easing(GLYPH_EASING);
const GLYPH_LAYOUT_TRANSITION =
  LinearTransition.duration(160).easing(GLYPH_EASING);
const AnimatedText = Animated.createAnimatedComponent(DesignSystemText);

/**
 * Props for text that animates numeric glyph changes without numeric
 * conversion, preserving formatted and high-precision strings.
 */
export interface AnimatedNumericTextProps {
  accessible?: boolean;
  animated?: boolean;
  color?: TextColor;
  /** Layout styles for the row that contains the glyphs. */
  containerStyle?: StyleProp<ViewStyle>;
  fontWeight?: FontWeight;
  /** Typography styles applied to every glyph. */
  style?: StyleProp<TextStyle>;
  testID?: string;
  value: string;
  variant?: TextVariant;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontVariant: ['tabular-nums'],
  },
});

export interface NumericGlyph {
  character: string;
  key: string;
}

/**
 * Gives digits stable left-to-right identities so appending or removing a
 * keypad digit keeps the existing glyphs mounted. Group separators use their
 * own identities, allowing them to enter or exit while surrounding digits
 * slide into their new positions.
 */
export const getNumericGlyphs = (value: string): NumericGlyph[] => {
  let digitIndex = 0;
  const separatorOccurrences = new Map<string, number>();

  return Array.from(value).map((character) => {
    if (/\d/u.test(character)) {
      const glyph = {
        character,
        key: `digit-${digitIndex}-${character}`,
      };
      digitIndex += 1;
      return glyph;
    }

    const occurrence = separatorOccurrences.get(character) ?? 0;
    separatorOccurrences.set(character, occurrence + 1);

    return {
      character,
      key: `separator-${character.codePointAt(0) ?? 0}-${occurrence}`,
    };
  });
};

const AnimatedNumericText = ({
  accessible = true,
  animated = true,
  value,
  variant = TextVariant.BodyMd,
  color = TextColor.TextDefault,
  containerStyle,
  fontWeight,
  style,
  testID,
}: AnimatedNumericTextProps) => {
  const hasRendered = useRef(false);
  // Some existing Jest suites provide partial Reanimated mocks.
  const reduceMotion = useReducedMotion();
  const motionEnabled = animated && !reduceMotion;
  const { prefix, numeric, suffix } = useMemo(
    () => splitNumericString(value),
    [value],
  );
  const numericGlyphs = useMemo(() => getNumericGlyphs(numeric), [numeric]);
  const animateGlyphs = motionEnabled && hasRendered.current;

  useEffect(() => {
    hasRendered.current = true;
  }, []);

  const renderStaticText = (content: string) => (
    <DesignSystemText
      accessible={false}
      color={color}
      fontWeight={fontWeight}
      style={[styles.text, style]}
      variant={variant}
    >
      {content}
    </DesignSystemText>
  );

  return (
    <Animated.View
      testID={testID}
      accessible={accessible}
      accessibilityRole={accessible ? 'text' : undefined}
      accessibilityLabel={accessible ? value : undefined}
      layout={animateGlyphs ? GLYPH_LAYOUT_TRANSITION : undefined}
      style={[styles.container, containerStyle]}
    >
      {!motionEnabled || !numeric ? (
        renderStaticText(value)
      ) : (
        <>
          {prefix ? renderStaticText(prefix) : null}
          {numericGlyphs.map(({ character, key }) => (
            <AnimatedText
              accessible={false}
              color={color}
              entering={animateGlyphs ? GLYPH_ENTER_TRANSITION : undefined}
              exiting={animateGlyphs ? GLYPH_EXIT_TRANSITION : undefined}
              fontWeight={fontWeight}
              key={key}
              layout={animateGlyphs ? GLYPH_LAYOUT_TRANSITION : undefined}
              style={[styles.text, style]}
              variant={variant}
            >
              {character}
            </AnimatedText>
          ))}
          {suffix ? renderStaticText(suffix) : null}
        </>
      )}
    </Animated.View>
  );
};

AnimatedNumericText.displayName = 'AnimatedNumericText';

export default memo(AnimatedNumericText);
