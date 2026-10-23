import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import {
  FontFamily,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Laminar } from 'react-native-laminar';

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
   * Clip the reel to the measured text width. Leave this off for proportional
   * body text: each digit slot is as wide as `0`, so the measured width is
   * short and the last character gets cut.
   */
  clipToBounds?: boolean;
  accessible?: boolean;
  testID?: string;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

/**
 * Rolls the numeric run of a formatted string with Laminar slots. Signs,
 * currency, and spaced words stay still. Callers that need a loading
 * placeholder should wrap this rather than adding that state here.
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
  const resolvedWeight =
    fontFamily === FontFamily.Hero ? FontWeight.Bold : fontWeight;
  const textStyle = tw.style(
    `text-${variant}`,
    `font-${fontFamily}-${resolvedWeight}`,
    color,
  ) as TextStyle;
  const motionEnabled = animated !== false && !reduceMotion;
  const { prefix, numeric, suffix } = useMemo(
    () => splitNumericString(value),
    [value],
  );

  const renderStaticText = (content: string) => (
    <Text accessible={false} style={textStyle}>
      {content}
    </Text>
  );

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
          <Laminar
            align="left"
            animationDuration={400}
            animationPreset="smooth"
            autoSize
            clipToBounds={clipToBounds}
            style={textStyle}
            text={numeric}
            variant="slots"
          />
          {suffix ? renderStaticText(suffix) : null}
        </>
      )}
    </View>
  );
};

AnimatedSlotText.displayName = 'AnimatedSlotText';

export default memo(AnimatedSlotText);
