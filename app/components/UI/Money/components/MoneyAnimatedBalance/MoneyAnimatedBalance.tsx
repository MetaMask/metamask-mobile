import React from 'react';
import { View } from 'react-native';
import { NumberFlow } from 'number-flow-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MONEY_BALANCE_FRACTION_DIGITS } from '../../utils/balanceAnimation';

interface MoneyAnimatedBalanceProps {
  /** The amount to render, in dollars. */
  amount: number;
  /** Whether reaching this amount should roll rather than appear instantly. */
  animated: boolean;
  testID?: string;
}

/**
 * The Money account balance, rendered as rolling digits.
 *
 * Which changes roll and which land silently is decided upstream by
 * `useMoneyBalanceAnimation` — this component only draws the result.
 */
const MoneyAnimatedBalance = ({
  amount,
  animated,
  testID,
}: MoneyAnimatedBalanceProps) => {
  const tw = useTailwind();

  return (
    <View testID={testID}>
      <NumberFlow
        value={amount}
        animated={animated}
        locales="en-US"
        format={{
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: MONEY_BALANCE_FRACTION_DIGITS,
          maximumFractionDigits: MONEY_BALANCE_FRACTION_DIGITS,
        }}
        style={tw.style('text-display-lg font-default-bold text-default')}
      />
    </View>
  );
};

export default MoneyAnimatedBalance;
