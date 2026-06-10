import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectProviders,
  selectUserRegion,
} from '../../../../selectors/rampsController';
import { getProviderBuyLimit } from '../utils/providerLimits';
import { getProviderLimitMessage } from '../utils/getProviderLimitMessage';
import { useFormatters } from '../../../hooks/useFormatters';

/**
 * Hook to validate a fiat amount against the selected provider's static buy
 * limits (`providers.selected` in `RampsController` state).
 *
 * Assumes the native-gated fiat flow, where `providers.selected` is the
 * provider quotes are requested with: the flow only renders when the selected
 * provider is native (see `useHasNativeFiatProvider`), and
 * `RampsController.getQuotes` resolves the selected provider first. If fiat
 * deposit opens up to non-native providers, limit lookup must use the same
 * provider resolution as `getQuotes` (needs a public accessor in core).
 *
 * @param options.amount - The fiat amount entered by the user.
 * @param options.paymentMethodId - The selected payment method ID.
 * @param options.currency - Fiat currency for limit lookup; defaults to `userRegion.country.currency`.
 *
 * @returns `{ minAmount, maxAmount, amountLimitError, currency }`.
 */
export function useRampsBuyLimits({
  amount,
  paymentMethodId,
  currency: currencyOverride,
}: {
  amount: number;
  paymentMethodId?: string | null;
  currency?: string;
}): {
  minAmount?: number;
  maxAmount?: number;
  amountLimitError: string | null;
  currency: string;
} {
  const provider = useSelector(selectProviders).selected;
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
