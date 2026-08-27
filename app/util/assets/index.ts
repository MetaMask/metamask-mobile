import { getIntlNumberFormatter } from '../intl';

export const formatWithThreshold = (
  amount: number | null,
  threshold: number,
  locale: string,
  options: Intl.NumberFormatOptions,
): string => {
  if (amount === null || isNaN(amount)) {
    return '';
  }

  // Ensures that if we are using currency, we are using the narrow symbol to match existing currencies.
  // E.g. instead of US$xx.yy we show $xx.yy
  if (options.currency && !options.currencyDisplay) {
    options.currencyDisplay = 'narrowSymbol';
  }

  if (amount === 0) {
    return getIntlNumberFormatter(locale, options).format(0);
  }
  return amount < threshold
    ? `<${getIntlNumberFormatter(locale, options).format(threshold)}`
    : getIntlNumberFormatter(locale, options).format(amount);
};
