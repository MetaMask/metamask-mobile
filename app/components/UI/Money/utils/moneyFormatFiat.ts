import BigNumber from 'bignumber.js';
import { formatWithThreshold } from '../../../../util/assets';
import { getIntlNumberFormatter } from '../../../../util/intl';
import I18n from '../../../../../locales/i18n';
import { getLocaleLanguageCode } from '../../../hooks/useFormatters';
import { MONEY_DEFAULT_FIAT_CURRENCY } from '../constants/fiat';

// One cent. Values strictly below this collapse to $0.00 — mUSD is USD-pegged
// so sub-cent fiat is economically meaningless.
export const DUST_THRESHOLD = 0.01;

/** Falls back to the Money default when a token carries no fiat currency. */
export const moneySafeTokenFiatCurrency = (
  token: { fiat?: { currency?: string } } | undefined | null,
): string => token?.fiat?.currency ?? MONEY_DEFAULT_FIAT_CURRENCY;

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

/**
 * Formats a positive amount as a signed, symbol-suffixed string, e.g.
 * "+1,234.56 mUSD". Returns `''` for a non-finite or non-positive amount so
 * callers can hide the amount line with `showPrimaryAmount`.
 *
 * @param amount - Decimal amount string as the provider reports it.
 * @param symbol - Currency code or token symbol to suffix.
 * @returns Signed amount string, or `''` when the amount is unusable.
 */
export const moneyFormatIncomingAmount = (
  amount: string | undefined,
  symbol: string,
): string => {
  const value = new BigNumber(amount ?? 'NaN');
  if (!value.isFinite() || !value.isGreaterThan(0)) {
    return '';
  }
  const formatted = getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value.toNumber());
  return `+${formatted} ${symbol}`;
};
