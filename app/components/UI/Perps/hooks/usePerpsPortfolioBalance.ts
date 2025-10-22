import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { RootState } from '../../../../reducers';
import { selectConversionRateBySymbol } from '../../../../selectors/currencyRateController';
import { selectPerpsBalances } from '../selectors/perpsController';
import { usePerpsLiveAccount } from './stream';

/**
 * Hook for getting aggregated Perps balance using hybrid approach:
 * - Live data for current balances (fixes account switching)
 * - Redux data for historical balances (enables 24h percentage calculations)
 */
export function usePerpsPortfolioBalance() {
  // Get USD to display currency conversion rate
  const usdConversionRate = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, 'usd'),
  );

  // Get live account data via WebSocket (for current balances)
  const { account } = usePerpsLiveAccount();

  // Get Redux balances (for historical data)
  const perpsBalances = useSelector(selectPerpsBalances);

  // Calculate current balances from live account data and historical from Redux
  const { totalBalance, totalUnrealizedPnl, totalBalance1dAgo } =
    useMemo(() => {
      const conversionRate = usdConversionRate || 1;

      // Current balances from live account data (real-time, fixes account switching)
      let currentTotalBalance = 0;
      let currentUnrealizedPnl = 0;

      if (account) {
        const totalBalanceUsd = new BigNumber(account.totalBalance || '0');
        const totalPnlUsd = new BigNumber(account.unrealizedPnl || '0');

        currentTotalBalance = totalBalanceUsd
          .multipliedBy(conversionRate)
          .toNumber();
        currentUnrealizedPnl = totalPnlUsd
          .multipliedBy(conversionRate)
          .toNumber();
      }

      // Historical balance from Redux (for 24h percentage calculations)
      let historical1dAgoBalance = 0;

      // Aggregate historical balance across all providers
      Object.values(perpsBalances).forEach((providerBalance) => {
        if (
          providerBalance &&
          typeof providerBalance === 'object' &&
          'accountValue1dAgo' in providerBalance
        ) {
          const balance1dAgoUsd = new BigNumber(
            providerBalance.accountValue1dAgo || '0',
          );
          historical1dAgoBalance += balance1dAgoUsd
            .multipliedBy(conversionRate)
            .toNumber();
        }
      });

      return {
        totalBalance: currentTotalBalance,
        totalUnrealizedPnl: currentUnrealizedPnl,
        totalBalance1dAgo: historical1dAgoBalance,
      };
    }, [account, perpsBalances, usdConversionRate]);

  return {
    // Current total account value in display currency (cash + positions)
    perpsBalance: totalBalance,
    // Account value 24h ago in display currency (for % change calculation)
    perpsBalance1dAgo: totalBalance1dAgo,
    // Current unrealized P&L from open positions in display currency
    unrealizedPnl: totalUnrealizedPnl,
    // Whether we have any perps data
    hasPerpsData: !!account,
    // Raw balances per provider
    perpsBalances,
  };
}
