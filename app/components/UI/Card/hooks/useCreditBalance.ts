import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import { selectCardFiatCreditFeatureEnabled } from '../../../../selectors/featureFlagController/card';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { getUsdToFiatConversionRate } from '../../Money/utils/moneyActivityFiat';
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

  return useMemo(() => {
    const wallet = walletQuery.data ?? null;
    const creditBalance = wallet?.balance ?? '0';
    const parsed = parseFloat(creditBalance);
    const creditBalanceNumber = Number.isFinite(parsed) ? parsed : 0;
    const hasCredit = enabled && creditBalanceNumber > 0;
    // ponytail: prices credit as 1 stablecoin ≈ 1 USD (ceiling: assumes
    // USDC/USDT ≈ $1; upgrade path is a market-data lookup by token address).
    const usdToFiat = getUsdToFiatConversionRate(currencyRates);
    const creditFiatNumber =
      usdToFiat !== undefined ? creditBalanceNumber * usdToFiat : undefined;

    return {
      wallet,
      creditBalance,
      creditBalanceNumber,
      creditCurrency: wallet?.currency,
      creditFiatNumber,
      hasCredit,
      isLoading: walletQuery.isLoading && walletQuery.isFetching,
    };
  }, [
    walletQuery.data,
    walletQuery.isLoading,
    walletQuery.isFetching,
    enabled,
    currencyRates,
  ]);
};

export default useCreditBalance;
