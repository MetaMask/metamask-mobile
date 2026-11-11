import { getFormatters } from '../../../hooks/useFormatters';

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

export function formatFiatAmount(value: number, currency: string): string {
  return getFormatters().formatCurrency(value, currency.toUpperCase());
}

export function formatFiat(value: number, currency: string): string {
  return getFormatters().formatCurrency(value, currency.toUpperCase(), {
    signDisplay: 'exceptZero',
  });
}
