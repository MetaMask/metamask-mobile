import React, { memo, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import {
  FontFamily,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Laminar } from 'react-native-laminar';

import { splitNumericString } from './splitNumericString';

export interface AnimatedBalanceTextProps {
  accessible?: boolean;
  color?: TextColor;
  isLoading: boolean;
  loadingValue: string;
  testID?: string;
  value: string;
  animated?: boolean;
  /**
   * Design-system face. Defaults to the default family. Hero always uses the
   * bold cut, which is the only Hero face the preset ships.
   */
  fontFamily?: FontFamily;
  /**
   * Design-system text variant. Defaults to DisplayLg.
   */
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

/**
 * Primes a numeric renderer with a muted placeholder, then rolls to the first
 * complete balance and every subsequent formatted-value update.
 */
const AnimatedBalanceText = ({
  accessible = true,
  color = TextColor.TextDefault,
  isLoading,
  loadingValue,
  testID,
  value,
  animated,
  fontFamily = FontFamily.Default,
  variant = TextVariant.DisplayLg,
}: AnimatedBalanceTextProps) => {
  const [animatedValue, setAnimatedValue] = useState(loadingValue);
  const tw = useTailwind();
  const reduceMotion = useReducedMotion();
  const balanceColor = isLoading ? TextColor.TextMuted : color;
  const fontClass =
    fontFamily === FontFamily.Hero ? 'font-hero-bold' : 'font-default-bold';
  const textStyle = StyleSheet.flatten([
    tw.style(`text-${variant}`, fontClass, balanceColor) as TextStyle,
    styles.text,
  ]) as TextStyle;
  const motionEnabled = animated !== false && !reduceMotion;
  const { prefix, numeric, suffix } = useMemo(
    () => splitNumericString(animatedValue),
    [animatedValue],
  );

  useLayoutEffect(() => {
    setAnimatedValue(isLoading ? loadingValue : value);
  }, [isLoading, loadingValue, value]);

  const renderStaticText = (content: string) => (
    <Text style={textStyle}>{content}</Text>
  );

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'text' : undefined}
      accessibilityLabel={accessible ? animatedValue : undefined}
      style={styles.container}
      testID={testID}
    >
      {!motionEnabled || !numeric ? (
        renderStaticText(animatedValue)
      ) : (
        <>
          {prefix ? renderStaticText(prefix) : null}
          <Laminar
            align="left"
            animationDuration={400}
            animationPreset="smooth"
            autoSize
            clipToBounds
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

AnimatedBalanceText.displayName = 'AnimatedBalanceText';

export default memo(AnimatedBalanceText);
