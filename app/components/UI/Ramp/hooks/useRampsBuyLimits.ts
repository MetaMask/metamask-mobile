import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectProviders, selectUserRegion } from '../../../../selectors/rampsController';
import { getProviderBuyLimit } from '../utils/providerLimits';
import { getProviderLimitMessage } from '../utils/getProviderLimitMessage';
import { useFormatters } from '../../../hooks/useFormatters';

/**
 * Hook to validate a fiat amount against a provider's static buy limits.
 *
 * @param options.providerId - The provider ID to validate against (e.g. from a ramps quote).
 * Resolved to a full Provider object from the providers data list.
 * @param options.amount - The fiat amount entered by the user.
 * @param options.paymentMethodId - The selected payment method ID.
 * @param options.currency - Fiat currency for limit lookup; defaults to `userRegion.country.currency`.
 *
 * @returns `{ minAmount, maxAmount, amountLimitError, currency }`.
 */
export function useRampsBuyLimits({
  providerId,
  amount,
  paymentMethodId,
  currency: currencyOverride,
}: {
  providerId: string | null | undefined;
  amount: number;
  paymentMethodId?: string | null;
  currency?: string;
}): {
  minAmount?: number;
  maxAmount?: number;
  amountLimitError: string | null;
  currency: string;
} {
  const { data: providers } = useSelector(selectProviders);
  const userRegion = useSelector(selectUserRegion);
  const provider = useMemo(
    () => (providerId ? (providers.find((p) => p.id === providerId) ?? null) : null),
    [providers, providerId],
  );
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
      }),
    [provider, currency, paymentMethodId, amount, formatCurrency],
  );

  return {
    minAmount: limit?.minAmount,
    maxAmount: limit?.maxAmount,
    amountLimitError,
    currency,
  };
}
