import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Provider } from '@metamask/ramps-controller';
import { selectUserRegion } from '../../../../selectors/rampsController';
import { getProviderBuyLimit } from '../utils/providerLimits';
import { getProviderLimitMessage } from '../utils/getProviderLimitMessage';
import { useFormatters } from '../../../hooks/useFormatters';

/**
 * Hook to validate a fiat amount against a provider's static buy limits.
 *
 * @param options.provider - The provider whose limits to validate against.
 * @param options.amount - The fiat amount entered by the user.
 * @param options.paymentMethodId - The selected payment method ID.
 * @param options.backendError - Optional raw provider error from the quotes
 * response, used as a fallback when structured limits are not available.
 * @param options.currency - Fiat currency for limit lookup; defaults to `userRegion.country.currency`.
 *
 * @returns `{ minAmount, maxAmount, amountLimitError, currency }`.
 */
export function useRampsBuyLimits({
  provider,
  amount,
  paymentMethodId,
  backendError,
  currency: currencyOverride,
}: {
  provider: Provider | null | undefined;
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
