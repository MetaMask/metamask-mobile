import React, { memo, useLayoutEffect, useState } from 'react';
import { TextColor } from '@metamask/design-system-react-native';

import AnimatedNumericText, {
  type AnimatedNumericTextProps,
} from './AnimatedNumericText';

export interface AnimatedBalanceTextProps
  extends Omit<AnimatedNumericTextProps, 'color' | 'value'> {
  color?: TextColor;
  isLoading: boolean;
  loadingColor?: TextColor;
  loadingValue: string;
  value: string;
}

/**
 * Primes a numeric renderer with a muted placeholder, then rolls to the first
 * complete balance and every subsequent formatted-value update.
 */
const AnimatedBalanceText = ({
  color = TextColor.TextDefault,
  isLoading,
  loadingColor = TextColor.TextMuted,
  loadingValue,
  value,
  ...props
}: AnimatedBalanceTextProps) => {
  const [animatedValue, setAnimatedValue] = useState(loadingValue);

  useLayoutEffect(() => {
    setAnimatedValue(isLoading ? loadingValue : value);
  }, [isLoading, loadingValue, value]);

  return (
    <AnimatedNumericText
      {...props}
      color={isLoading ? loadingColor : color}
      value={animatedValue}
    />
  );
};

AnimatedBalanceText.displayName = 'AnimatedBalanceText';

export default memo(AnimatedBalanceText);
