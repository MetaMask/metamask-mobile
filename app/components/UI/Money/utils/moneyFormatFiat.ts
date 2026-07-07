import BigNumber from 'bignumber.js';
import { formatWithThreshold } from '../../../../util/assets';
import { getLocaleLanguageCode } from '../../../hooks/useFormatters';

// One cent. Values strictly below this collapse to $0.00 — mUSD is USD-pegged
// so sub-cent fiat is economically meaningless.
export const DUST_THRESHOLD = 0.01;

/**
 * Shared core: collapses sub-cent dust to zero, then formats via
 * formatWithThreshold so `<$0.01` is never shown in the Money domain.
 */
const formatMoney = (
  value: BigNumber,
  locale: string,
  currency: string,
): string => {
  const effective = value.abs().lt(DUST_THRESHOLD) ? new BigNumber(0) : value;
  return formatWithThreshold(effective.toNumber(), DUST_THRESHOLD, locale, {
    style: 'currency',
    currency,
  });
};

/**
 * Formats a fiat value in the user's selected currency and locale.
 *
 * @param value - The fiat value to format.
 * @param currentCurrency - The user's selected currency to format the value in.
 * @returns The formatted fiat value.
 */
export const moneyFormatFiat = (
  value: BigNumber,
  currentCurrency: string,
): string => formatMoney(value, getLocaleLanguageCode(), currentCurrency);

/**
 * Formats a US-dollar value with proper dollar formatting ($1,234.56),
 * independent of the user's preferred currency or locale. Money Account
 * amounts are mUSD (USD-pegged) and are always shown in dollars.
 *
 * @param value - The dollar value to format.
 * @returns The formatted dollar value.
 */
export const moneyFormatUsd = (value: BigNumber): string =>
  formatMoney(value, 'en-US', 'USD');
