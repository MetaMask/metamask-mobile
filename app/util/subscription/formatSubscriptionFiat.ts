import { getFormatters } from '../../components/hooks/useFormatters';

// Intl accepts any three-letter code. The shared formatters drop the code for anything else, so those are handled here.
const INTL_CURRENCY_CODE = /^[A-Z]{3}$/u;

/**
 * Formats a subscription amount as localized fiat using the app language.
 *
 * @param amount - Amount in major currency units.
 * @param currency - ISO-4217 currency code, case-insensitive.
 * @returns A localized currency string, or a plain fallback when Intl rejects the currency.
 */
export const formatSubscriptionFiat = (
  amount: number,
  currency: string,
): string => {
  const currencyCode = currency.toUpperCase();

  if (!INTL_CURRENCY_CODE.test(currencyCode) || !Number.isFinite(amount)) {
    return `${amount} ${currencyCode}`;
  }

  return getFormatters().formatCurrency(amount, currencyCode, {
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
