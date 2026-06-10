import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectUserRegion,
  selectProviders,
} from '../../../../selectors/rampsController';
import { getProviderBuyLimit } from '../utils/providerLimits';
import { getProviderLimitMessage } from '../utils/getProviderLimitMessage';
import { useFormatters } from '../../../hooks/useFormatters';

/**
 * Hook to validate a fiat amount against the selected provider's static buy
 * limits.
 *
 * Buy limits are provider+fiat+paymentMethod scoped (not asset-specific), and
 * the consuming flows operate on the globally-selected provider (the fiat
 * deposit screen is native-gated, so the selected provider is always native).
 * The limits are therefore read from the selected provider in Redux rather than
 * resolved per-asset.
 *
 * @param options.amount - The fiat amount entered by the user.
 * @param options.paymentMethodId - The selected payment method ID.
 * @param options.backendError - Optional raw provider error from the quotes
 * response, used as a fallback when structured limits are not available.
 * @param options.currency - Override fiat currency for limit lookup; defaults to `userRegion.country.currency`.
 *
 * @returns `{ minAmount, maxAmount, amountLimitError, currency }`.
 */
export function useRampsBuyLimits({
  amount,
  paymentMethodId,
  backendError,
  currency: currencyOverride,
}: {
  amount: number;
  paymentMethodId?: string | null;
  backendError?: string | null;
  currency?: string;
}): {
  minAmount?: number;
  maxAmount?: number;
  amountLimitError: string | null;
  currency: string;
} {
  const userRegion = useSelector(selectUserRegion);
  const providers = useSelector(selectProviders);
  const provider = providers.selected ?? null;
  const currency = currencyOverride ?? userRegion?.country?.currency ?? 'USD';
  const { formatCurrency } = useFormatters();

  const limit = useMemo(
    () => getProviderBuyLimit(provider, currency, paymentMethodId),
    [provider, currency, paymentMethodId],
  );

  const amountLimitError = useMemo(
    () =>
      getProviderLimitMessage({
        provider,
        fiatCurrency: currency,
        paymentMethodId,
        amount,
        currency,
        formatCurrency,
        backendError,
      }),
    [provider, currency, paymentMethodId, amount, formatCurrency, backendError],
  );

  return {
    minAmount: limit?.minAmount,
    maxAmount: limit?.maxAmount,
    amountLimitError,
    currency,
  };
}

export default useRampsBuyLimits;
