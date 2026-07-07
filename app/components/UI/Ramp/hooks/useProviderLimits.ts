import { useMemo } from 'react';
import type { Provider } from '@metamask/ramps-controller';
import { getProviderLimitMessage } from '../utils/getProviderLimitMessage';
import { useFormatters } from '../../../hooks/useFormatters';

interface UseProviderLimitsParams {
  provider: Provider | null | undefined;
  fiatCurrency: string | null | undefined;
  paymentMethodId: string | null | undefined;
  amount: number;
  currency: string;
}

export function useProviderLimits({
  provider,
  fiatCurrency,
  paymentMethodId,
  amount,
  currency,
}: UseProviderLimitsParams): { amountLimitError: string | null } {
  const { formatCurrency } = useFormatters();

  const amountLimitError = useMemo(
    () =>
      getProviderLimitMessage({
        provider,
        fiatCurrency,
        paymentMethodId,
        amount,
        currency,
        formatCurrency,
      }),
    [provider, fiatCurrency, paymentMethodId, amount, currency, formatCurrency],
  );

  return { amountLimitError };
}
