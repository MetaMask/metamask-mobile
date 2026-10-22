import React, { memo, useLayoutEffect, useState } from 'react';
import {
  FontFamily,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import AnimatedSlotText from './AnimatedSlotText';

export interface AnimatedBalanceTextProps {
  accessible?: boolean;
  color?: TextColor;
  isLoading: boolean;
  loadingValue: string;
  testID?: string;
  value: string;
  animated?: boolean;
  /**
   * Design-system face. Defaults to Hero, which always uses the bold cut.
   */
  fontFamily?: FontFamily;
  /**
   * Design-system text variant. Defaults to AmountDisplayLg.
   */
  variant?: TextVariant;
}

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
  fontFamily = FontFamily.Hero,
  variant = TextVariant.AmountDisplayLg,
}: AnimatedBalanceTextProps) => {
  const [animatedValue, setAnimatedValue] = useState(loadingValue);
  const balanceColor = isLoading ? TextColor.TextMuted : color;

  useLayoutEffect(() => {
    setAnimatedValue(isLoading ? loadingValue : value);
  }, [isLoading, loadingValue, value]);

  return (
    <AnimatedSlotText
      accessible={accessible}
      animated={animated}
      color={balanceColor}
      fontFamily={fontFamily}
      fontWeight={FontWeight.Bold}
      testID={testID}
      value={animatedValue}
      variant={variant}
    />
  );
};

AnimatedBalanceText.displayName = 'AnimatedBalanceText';

export default memo(AnimatedBalanceText);
