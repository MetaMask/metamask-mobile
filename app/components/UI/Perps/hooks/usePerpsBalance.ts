import { useSelector } from 'react-redux';
import { selectConversionRateBySymbol } from '../../../../selectors/currencyRateController';
import { usePerpsLiveAccount } from './stream';
import { usePerpsHistoricalPortfolio } from './usePerpsHistoricalPortfolio';
import { RootState } from '../../../../reducers';

/**
 * Hook for getting Perps balance in display currency
 * Handles USD to display currency conversion automatically
 */
export function usePerpsBalance() {
  // Get USD to display currency conversion rate
  const usdConversionRate = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, 'usd'),
  );

  // Get Perps live account data
  const { account: perpsAccount, isInitialLoading: isPerpsLoading } =
    usePerpsLiveAccount();

  // Get historical portfolio data
  const { accountValue1dAgo } = usePerpsHistoricalPortfolio();

  // Convert USD values to display currency
  const conversionRate = usdConversionRate || 1;
  const perpsBalanceUsd = parseFloat(perpsAccount?.totalValue || '0');
  const perpsBalance1dAgoUsd = parseFloat(
    accountValue1dAgo || perpsAccount?.totalValue || '0',
  );

  const perpsBalance = perpsBalanceUsd * conversionRate;
  const perpsBalance1dAgo = perpsBalance1dAgoUsd * conversionRate;

  return {
    // Current balance in display currency
    perpsBalance,
    // Historical balance (24h ago) in display currency
    perpsBalance1dAgo,
    // Raw USD values
    perpsBalanceUsd,
    perpsBalance1dAgoUsd,
    // Conversion rate used
    conversionRate,
    // Loading state
    isPerpsLoading,
  };
}
