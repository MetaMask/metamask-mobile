import type { Provider } from '@metamask/ramps-controller';
import { strings } from '../../../../../locales/i18n';
import type { useFormatters } from '../../../hooks/useFormatters';
import { getProviderBuyLimit } from './providerLimits';
import { isProviderLimitError } from './isProviderLimitError';

type FormatCurrency = ReturnType<typeof useFormatters>['formatCurrency'];

interface GetProviderLimitMessageArgs {
  provider: Provider | null | undefined;
  fiatCurrency: string | null | undefined;
  paymentMethodId: string | null | undefined;
  amount: number;
  currency: string;
  formatCurrency: FormatCurrency;
  /**
   * Raw per-provider error string from the quotes response. Used as a fallback
   * when structured limits aren't published for the provider (e.g.
   * browser-redirect providers like Revolut, which the regions/providers
   * endpoint omits in some environments).
   */
  backendError?: string | null;
}

/**
 * Resolves the user-facing limit message for a provider that can't quote.
 *
 * Prefers the provider's structured limits (`limits.fiat[ccy][paymentMethod]`)
 * — the same values the backend enforces — so the message is localized via
 * i18n. Falls back to the backend's own English limit string (e.g. "Minimum
 * purchase is 12 EUR") when structured limits aren't available. Returns null
 * when it isn't a limit situation, so the caller can show a generic
 * "Quote unavailable" rather than leaking a technical provider error.
 *
 * @returns The localized or backend limit message, or null.
 */
export function getProviderLimitMessage({
  provider,
  fiatCurrency,
  paymentMethodId,
  amount,
  currency,
  formatCurrency,
  backendError,
}: GetProviderLimitMessageArgs): string | null {
  if (amount > 0) {
    const buyLimit = getProviderBuyLimit(
      provider,
      fiatCurrency,
      paymentMethodId,
    );

    if (buyLimit) {
      if (buyLimit.minAmount != null && amount < buyLimit.minAmount) {
        return strings('fiat_on_ramp.min_purchase_limit', {
          amount: formatCurrency(buyLimit.minAmount, currency, {
            currencyDisplay: 'narrowSymbol',
          }),
        });
      }

      if (buyLimit.maxAmount != null && amount > buyLimit.maxAmount) {
        return strings('fiat_on_ramp.max_purchase_limit', {
          amount: formatCurrency(buyLimit.maxAmount, currency, {
            currencyDisplay: 'narrowSymbol',
          }),
        });
      }
    }
  }

  if (isProviderLimitError(backendError)) {
    return backendError;
  }

  return null;
}
