import React from 'react';
import { View } from 'react-native';
import { NumberFlow } from 'number-flow-react-native';
import {
  MONEY_BALANCE_LOCALES,
  MONEY_BALANCE_NUMBER_FORMAT,
  useMoneyBalanceTextStyle,
} from './moneyBalanceNumberFlow';

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
  const style = useMoneyBalanceTextStyle();

  return (
    <View testID={testID}>
      <NumberFlow
        value={amount}
        animated={animated}
        locales={MONEY_BALANCE_LOCALES}
        format={MONEY_BALANCE_NUMBER_FORMAT}
        style={style}
      />
    </View>
  );
};

export default MoneyAnimatedBalance;
