import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { selectUserRegion } from '../../../../selectors/rampsController';
import Engine from '../../../../core/Engine';
import { getProviderBuyLimit } from '../utils/providerLimits';
import { getProviderLimitMessage } from '../utils/getProviderLimitMessage';
import { useFormatters } from '../../../hooks/useFormatters';

/**
 * Hook to validate a fiat amount against the best provider's static buy limits.
 *
 * Resolves the best provider for a given asset via
 * `Engine.context.RampsController.getBestProviderForAsset`, wrapped in React
 * Query so the async result is cached and deduplicated across consumers.
 *
 * @param options.assetId - CAIP-19 asset identifier. When omitted the query is
 * disabled and the hook returns graceful defaults.
 * @param options.amount - The fiat amount entered by the user.
 * @param options.paymentMethodId - The selected payment method ID.
 * @param options.backendError - Optional raw provider error from the quotes
 * response, used as a fallback when structured limits are not available.
 * @param options.currency - Fiat currency code to look up limits for. Defaults
 * to `userRegion.country.currency`. Pass `'usd'` when the amount is
 * USD-denominated (e.g. money-account deposit where the input is always in USD)
 * so the limit lookup uses USD limits rather than the local currency.
 *
 * @returns `{ minAmount, maxAmount, amountLimitError, currency }`.
 */
export function useRampsBuyLimits({
  assetId,
  amount,
  paymentMethodId,
  backendError,
  currency: currencyOverride,
}: {
  assetId?: string;
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

  const { data: provider = null } = useQuery({
    queryKey: ['ramps', 'bestProvider', assetId, userRegion?.regionCode],
    queryFn: () =>
      Engine.context.RampsController.getBestProviderForAsset({
        assetId: assetId as string,
      }),
    enabled: Boolean(assetId),
    staleTime: 5 * 60 * 1000,
  });

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
