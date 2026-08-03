import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NumberFlow } from 'number-flow-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MONEY_BALANCE_FRACTION_DIGITS } from '../../utils/balanceAnimation';

/** mUSD is USD-pegged, so the balance is always whole-cent dollars. */
const NUMBER_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: MONEY_BALANCE_FRACTION_DIGITS,
  maximumFractionDigits: MONEY_BALANCE_FRACTION_DIGITS,
};

const LOCALES = 'en-US';

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', opacity: 0 },
});

/**
 * NumberFlow caches glyph measurements per font configuration, so the warmer
 * and the balance must resolve the same style or they measure into different
 * entries and the warmer silently does nothing.
 *
 * @returns The design system's DisplayLg bold text style.
 */
const useBalanceTextStyle = () =>
  useTailwind().style('text-display-lg font-default-bold text-default');

interface MoneyAnimatedBalanceProps {
  /** The amount to render, in dollars. */
  amount: number;
  /** Whether reaching this amount should roll rather than appear instantly. */
  animated: boolean;
  testID?: string;
}

/**
 * Measures the balance typography before the balance is on screen.
 *
 * NumberFlow renders plain text until it has measured the font, and a value
 * changing while it is unmeasured lands without animating. Mounting this while
 * the balance loads means measurement happens during the network round-trip.
 * Measurements are cached for the life of the process, so this runs once.
 */
export const MoneyBalanceMetricsWarmer = () => {
  const style = useBalanceTextStyle();
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
        locales={LOCALES}
        format={NUMBER_FORMAT}
        style={style}
      />
    </View>
  );
};

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
  const style = useBalanceTextStyle();
  return (
    <View testID={testID}>
      <NumberFlow
        value={amount}
        animated={animated}
        locales={LOCALES}
        format={NUMBER_FORMAT}
        style={style}
      />
    </View>
  );
};

export default MoneyAnimatedBalance;
