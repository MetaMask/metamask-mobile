import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
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
  const { account, aggregate } = usePerpsLiveAccount();

  // Get Redux balances (for historical data)
  const perpsBalances = useSelector(selectPerpsBalances);

  // Calculate current balances from live account data and historical from Redux
  const { totalBalance, totalUnrealizedPnl, totalBalance1dAgo, isPartial } =
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

      // Match the historical baseline to the venues represented in the live
      // total. Missing or non-finite observations make the baseline unavailable,
      // rather than counting an incomplete history as zero.
      const venueIds: string[] = account?.providerStates
        ? Object.keys(account.providerStates)
        : account
          ? [account.providerId ?? 'hyperliquid']
          : [];
      let historical1dAgoBalance: number | undefined =
        venueIds.length > 0 ? 0 : undefined;

      for (const providerId of venueIds) {
        const providerBalance = perpsBalances[providerId];
        const accountValue1dAgo = providerBalance?.accountValue1dAgo;
        const balance1dAgoUsd =
          accountValue1dAgo === undefined
            ? undefined
            : new BigNumber(accountValue1dAgo);
        if (!balance1dAgoUsd?.isFinite()) {
          historical1dAgoBalance = undefined;
          break;
        }
        historical1dAgoBalance =
          (historical1dAgoBalance ?? 0) +
          balance1dAgoUsd.multipliedBy(conversionRate).toNumber();
      }

      return {
        totalBalance: currentTotalBalance,
        totalUnrealizedPnl: currentUnrealizedPnl,
        totalBalance1dAgo: historical1dAgoBalance,
        /** True when the combined total is a subtotal over available venues. */
        isPartial: aggregate?.status === 'partial',
      };
    }, [account, aggregate, perpsBalances, usdConversionRate]);

  return {
    // Current total account value in display currency (cash + positions)
    perpsBalance: totalBalance,
    // Account value 24h ago in display currency (for % change calculation);
    // undefined when a provider lacks the 1d-ago observation
    perpsBalance1dAgo: totalBalance1dAgo,
    // Current unrealized P&L from open positions in display currency
    unrealizedPnl: totalUnrealizedPnl,
    // Whether we have any perps data
    hasPerpsData: !!account,
    // True when one or more enabled venues failed to report, so the total is
    // a subtotal rather than the user's complete portfolio value
    isPartial,
    // Raw balances per provider
    perpsBalances,
  };
}
