import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';

export interface UsdToFiatRate {
  currency: string;
  rate: number | undefined;
}

export interface ConvertedFiat {
  value: number;
  currency: string;
}

/**
 * Converts a USD amount using one rate snapshot.
 *
 * A missing, zero, or non-finite rate deliberately keeps the amount in USD so
 * a stale or incomplete rate can never turn a real value into zero.
 */
export function convertUsdToFiat(
  usd: number,
  conversion: UsdToFiatRate,
): ConvertedFiat;
export function convertUsdToFiat(
  usd: number,
  rate: number | undefined,
  currency?: string,
): ConvertedFiat;
export function convertUsdToFiat(
  usd: number,
  conversionOrRate: UsdToFiatRate | number | undefined,
  currency = 'USD',
): ConvertedFiat {
  const rate =
    typeof conversionOrRate === 'object'
      ? conversionOrRate.rate
      : conversionOrRate;
  const selectedCurrency =
    typeof conversionOrRate === 'object' ? conversionOrRate.currency : currency;

  if (rate === undefined || rate === 0 || !Number.isFinite(rate)) {
    return { value: usd, currency: 'USD' };
  }

  return {
    value: usd * rate,
    currency: selectedCurrency.toUpperCase(),
  };
}

/**
 * Formats a fiat amount with an explicit sign for non-zero PnL.
 */
export function formatFiat(
  value: number,
  currency: string,
  locale: string = I18n.locale,
): string {
  return getIntlNumberFormatter(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    currencyDisplay: 'narrowSymbol',
    signDisplay: 'exceptZero',
  }).format(value);
}
