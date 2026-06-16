import I18n from '../../../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../../../util/intl';

/**
 * Resolves how many fraction digits a currency uses for display (e.g. 2 for
 * USD/EUR, 0 for JPY/KRW, 3 for BHD). Used to round fiat amounts to a precision
 * that's valid for the active currency instead of assuming two decimals.
 *
 * Falls back to 2 when the currency is unknown or `Intl` can't resolve it.
 */
export const getCurrencyFractionDigits = (currency: string): number => {
  try {
    const { maximumFractionDigits } = getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
    }).resolvedOptions();
    return maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
};

/**
 * Rounds a numeric fiat amount to the active currency's fraction digits and
 * returns it as a plain decimal string (no symbol/grouping), suitable for use
 * as the canonical entered-amount value (`fiatAmount`/`quotedFiatAmount`).
 */
export const roundFiatAmount = (value: number, currency: string): string =>
  value.toFixed(getCurrencyFractionDigits(currency));
