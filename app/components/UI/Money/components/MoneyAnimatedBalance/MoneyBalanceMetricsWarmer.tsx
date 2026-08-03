import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NumberFlow } from 'number-flow-react-native';
import {
  MONEY_BALANCE_LOCALES,
  MONEY_BALANCE_NUMBER_FORMAT,
  useMoneyBalanceTextStyle,
} from './moneyBalanceNumberFlow';

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    opacity: 0,
  },
});

/**
 * Measures the balance typography before the balance itself is on screen.
 *
 * NumberFlow renders plain text until it has measured the font, and a value
 * that changes while it is still unmeasured lands without animating. The first
 * balance of a session arrives moments after the rolling balance mounts, which
 * would otherwise lose the catch-up roll entirely.
 *
 * Measurements are cached per font configuration for the life of the process,
 * so this measures once and every later mount reads it synchronously.
 */
const MoneyBalanceMetricsWarmer = () => {
  const style = useMoneyBalanceTextStyle();

  return (
    <View
      style={styles.offscreen}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <NumberFlow
        value={0}
        animated={false}
        locales={MONEY_BALANCE_LOCALES}
        format={MONEY_BALANCE_NUMBER_FORMAT}
        style={style}
      />
    </View>
  );
};

export default MoneyBalanceMetricsWarmer;
