import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import { selectCardFiatCreditFeatureEnabled } from '../../../../selectors/featureFlagController/card';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { getUsdToFiatConversionRate } from '../../Money/utils/moneyActivityFiat';
import { getStablecoinFiatAmount } from '../util/getStablecoinFiatAmount';
import { cardQueries } from '../queries';
import { useCardCapabilities } from './useCardCapabilities';
import type { CreditWalletResponse } from '../../../../core/Engine/controllers/card-controller/provider-types';

interface UseCreditBalanceResult {
  wallet: CreditWalletResponse | null;
  creditBalance: string;
  creditBalanceNumber: number;
  creditCurrency: string | undefined;
  creditFiatNumber: number | undefined;
  hasCredit: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
}

const useCreditBalance = (): UseCreditBalanceResult => {
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const isFeatureEnabled = useSelector(selectCardFiatCreditFeatureEnabled);
  const currencyRates = useSelector(selectCurrencyRates);
  const capabilities = useCardCapabilities();
  const supportsCredit = capabilities?.supportsCredit ?? false;

  const enabled = isAuthenticated && isFeatureEnabled && supportsCredit;

  const walletQuery = useQuery({
    ...cardQueries.credit.walletOptions(),
    enabled,
  });
  const {
    data: walletData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = walletQuery;

  return useMemo(() => {
    const wallet = walletData ?? null;
    const creditBalance = wallet?.balance ?? '0';
    const parsed = parseFloat(creditBalance);
    const creditBalanceNumber = Number.isFinite(parsed) ? parsed : 0;
    const hasCredit = enabled && creditBalanceNumber > 0;
    const usdToFiat = getUsdToFiatConversionRate(currencyRates);
    const creditFiatNumber = getStablecoinFiatAmount(
      creditBalanceNumber,
      usdToFiat,
    );

    return {
      wallet,
      creditBalance,
      creditBalanceNumber,
      creditCurrency: wallet?.currency,
      creditFiatNumber,
      hasCredit,
      isLoading,
      error: enabled ? ((error as Error | null) ?? null) : null,
      refetch,
      isRefetching,
    };
  }, [
    walletData,
    isLoading,
    error,
    refetch,
    isRefetching,
    enabled,
    currencyRates,
  ]);
};

export default useCreditBalance;
