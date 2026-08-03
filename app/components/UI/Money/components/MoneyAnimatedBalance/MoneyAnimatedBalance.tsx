import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NumberFlow } from 'number-flow-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MONEY_BALANCE_FRACTION_DIGITS } from '../../utils/balanceAnimation';

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', opacity: 0 },
});

interface BalanceDigitsProps {
  value: number;
  animated: boolean;
}

/**
 * The rolling digits. NumberFlow caches glyph measurements per font
 * configuration, so the warmer and the balance must both render through here or
 * they measure into separate cache entries.
 */
const BalanceDigits = ({ value, animated }: BalanceDigitsProps) => {
  const tw = useTailwind();
  return (
    <NumberFlow
      value={value}
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
  );
};

/**
 * Measures the balance typography while the balance is still loading, so
 * NumberFlow is measured by the time the first figure lands.
 */
export const MoneyBalanceMetricsWarmer = () => (
  <View
    style={styles.offscreen}
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <BalanceDigits value={0} animated={false} />
  </View>
);

interface MoneyAnimatedBalanceProps {
  amount: number;
  animated: boolean;
  testID?: string;
}

const MoneyAnimatedBalance = ({
  amount,
  animated,
  testID,
}: MoneyAnimatedBalanceProps) => (
  <View testID={testID}>
    <BalanceDigits value={amount} animated={animated} />
  </View>
);

export default MoneyAnimatedBalance;
