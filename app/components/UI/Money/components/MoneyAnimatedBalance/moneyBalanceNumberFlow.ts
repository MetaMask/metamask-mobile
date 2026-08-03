import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { TextStyle } from 'react-native';
import { MONEY_BALANCE_FRACTION_DIGITS } from '../../utils/balanceAnimation';

export const MONEY_BALANCE_LOCALES = 'en-US';

/** mUSD is USD-pegged, so the balance is always shown in whole-cent dollars. */
export const MONEY_BALANCE_NUMBER_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: MONEY_BALANCE_FRACTION_DIGITS,
  maximumFractionDigits: MONEY_BALANCE_FRACTION_DIGITS,
};

/**
 * Typography for the rolling balance, matching the design system's DisplayLg
 * bold text.
 *
 * NumberFlow caches glyph measurements per font configuration, so the warmer
 * and the balance itself must resolve byte-identical styles or they measure
 * into different cache entries.
 *
 * @returns The resolved text style.
 */
export const useMoneyBalanceTextStyle = (): TextStyle => {
  const tw = useTailwind();
  return tw.style('text-display-lg font-default-bold text-default');
};
