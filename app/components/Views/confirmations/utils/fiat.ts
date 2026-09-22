import { BigNumber } from 'bignumber.js';

import I18n from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { getIntlNumberFormatter } from '../../../../util/intl';

/**
 * Formats an amount already denominated in `currency`.
 *
 * This only formats -- it does not derive rates or convert values. Callers
 * must pass an amount already expressed in `currency`; rate selection belongs
 * with whoever reads the price data.
 *
 * Returns `undefined` when the amount is `undefined`, so callers can pass
 * through a missing rate as "hide fiat".
 */
export function formatFiat(
  amount: BigNumber.Value | undefined,
  currency: string,
): string | undefined {
  if (amount === undefined) {
    return undefined;
  }

  const value = new BigNumber(amount);
  const hasDecimals = !value.isInteger();

  try {
    return getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
    }).format(value.toFixed() as unknown as number);
  } catch (error) {
    Logger.error(error as Error);
    return `${value.toFixed()} ${currency}`;
  }
}
