import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
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
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { splitNumericString } from './splitNumericString';

const useReducedMotion = useNativeReducedMotion ?? (() => false);
const GLYPH_EASING = Easing.out(Easing.cubic);
const GLYPH_ENTER_TRANSITION = ZoomIn.duration(120).easing(GLYPH_EASING);
const GLYPH_EXIT_TRANSITION = ZoomOut.duration(90).easing(GLYPH_EASING);
const GLYPH_LAYOUT_TRANSITION =
  LinearTransition.duration(160).easing(GLYPH_EASING);

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

const FONT_WEIGHT_SUFFIX: Record<FontWeight, string> = {
  [FontWeight.Regular]: 'regular',
  [FontWeight.Medium]: 'medium',
  [FontWeight.Bold]: 'bold',
};

const VARIANT_FONT_WEIGHT: Record<TextVariant, FontWeight> = {
  [TextVariant.DisplayLg]: FontWeight.Bold,
  [TextVariant.DisplayMd]: FontWeight.Bold,
  [TextVariant.HeadingLg]: FontWeight.Bold,
  [TextVariant.HeadingMd]: FontWeight.Bold,
  [TextVariant.HeadingSm]: FontWeight.Bold,
  [TextVariant.BodyLg]: FontWeight.Medium,
  [TextVariant.BodyMd]: FontWeight.Regular,
  [TextVariant.BodySm]: FontWeight.Regular,
  [TextVariant.BodyXs]: FontWeight.Regular,
  [TextVariant.PageHeading]: FontWeight.Bold,
  [TextVariant.SectionHeading]: FontWeight.Bold,
  [TextVariant.ButtonLabelMd]: FontWeight.Medium,
  [TextVariant.ButtonLabelLg]: FontWeight.Medium,
  [TextVariant.AmountDisplayLg]: FontWeight.Bold,
};

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
  const tw = useTailwind();
  const hasRendered = useRef(false);
  // Some existing Jest suites provide partial Reanimated mocks.
  const reduceMotion = useReducedMotion();
  const textStyle = useMemo(() => {
    const weight = fontWeight ?? VARIANT_FONT_WEIGHT[variant];

    return StyleSheet.flatten([
      tw.style(
        `text-${variant}`,
        `font-default-${FONT_WEIGHT_SUFFIX[weight]}`,
        color,
      ),
      styles.text,
      style,
    ]) as TextStyle;
  }, [color, fontWeight, style, tw, variant]);
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
    <Text style={textStyle}>{content}</Text>
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
            <Animated.Text
              entering={animateGlyphs ? GLYPH_ENTER_TRANSITION : undefined}
              exiting={animateGlyphs ? GLYPH_EXIT_TRANSITION : undefined}
              key={key}
              layout={animateGlyphs ? GLYPH_LAYOUT_TRANSITION : undefined}
              style={textStyle}
            >
              {character}
            </Animated.Text>
          ))}
          {suffix ? renderStaticText(suffix) : null}
        </>
      )}
    </Animated.View>
  );
};

AnimatedNumericText.displayName = 'AnimatedNumericText';

export default memo(AnimatedNumericText);
