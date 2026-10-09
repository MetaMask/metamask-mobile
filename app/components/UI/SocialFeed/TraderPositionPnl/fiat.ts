import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';

export interface ConvertedFiat {
  amount: number;
  currency: string;
  /** True when the selected currency had no usable rate, so the amount stayed in USD. */
  fellBackToUsd: boolean;
}

/**
 * Converts one USD amount with a single rate.
 * A missing or non-positive rate keeps the USD amount and says so via
 * `fellBackToUsd`. Percentages must not be passed through here.
 */
export const convertUsdToFiat = (
  usd: number,
  currency: string,
  rate: number | null,
): ConvertedFiat => {
  const normalized = currency.toLowerCase();
  if (
    normalized === 'usd' ||
    rate == null ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return {
      amount: usd,
      currency: 'usd',
      fellBackToUsd: normalized !== 'usd',
    };
  }

  return {
    amount: usd * rate,
    currency: normalized,
    fellBackToUsd: false,
  };
};

/**
 * Signed fiat for a value that is already in `currency`.
 * Zero has no sign (`signDisplay: 'exceptZero'`).
 */
export const formatFiat = (amount: number, currency: string): string => {
  if (!Number.isFinite(amount)) {
    return '';
  }

  return getIntlNumberFormatter(I18n.locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    signDisplay: 'exceptZero',
  }).format(amount);
};
