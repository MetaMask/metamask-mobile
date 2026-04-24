import { useMemo } from 'react';
import type { Provider } from '@metamask/ramps-controller';
import { getProviderBuyLimit } from '../utils/providerLimits';
import { useFormatters } from '../../../hooks/useFormatters';
import { strings } from '../../../../../locales/i18n';

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

  const buyLimit = useMemo(
    () => getProviderBuyLimit(provider, fiatCurrency, paymentMethodId),
    [provider, fiatCurrency, paymentMethodId],
  );

  const amountLimitError = useMemo(() => {
    if (amount <= 0 || !buyLimit) {
      return null;
    }

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

    return null;
  }, [amount, currency, formatCurrency, buyLimit]);

  return { amountLimitError };
}
