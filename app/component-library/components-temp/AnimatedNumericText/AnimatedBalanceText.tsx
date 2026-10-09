import React, { memo, useLayoutEffect, useState } from 'react';
import { TextColor } from '@metamask/design-system-react-native';

import AnimatedNumericText from './AnimatedNumericText';

export interface AnimatedBalanceTextProps {
  color?: TextColor;
  isLoading: boolean;
  loadingValue: string;
  testID?: string;
  value: string;
  animated?: boolean;
  accessible?: boolean;
}

/**
 * Primes a numeric renderer with a muted placeholder, then rolls to the first
 * complete balance and every subsequent formatted-value update.
 */
const AnimatedBalanceText = ({
  color = TextColor.TextDefault,
  isLoading,
  loadingValue,
  testID,
  value,
  animated,
  accessible,
}: AnimatedBalanceTextProps) => {
  const [animatedValue, setAnimatedValue] = useState(loadingValue);

  useLayoutEffect(() => {
    setAnimatedValue(isLoading ? loadingValue : value);
  }, [isLoading, loadingValue, value]);

  return (
    <AnimatedNumericText
      animated={animated}
      accessible={accessible}
      color={isLoading ? TextColor.TextMuted : color}
      testID={testID}
      value={animatedValue}
    />
  );
};

AnimatedBalanceText.displayName = 'AnimatedBalanceText';

export default memo(AnimatedBalanceText);
