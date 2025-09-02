import { useSelector } from 'react-redux';
import { useMemo, useEffect, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import { RootState } from '../../../../reducers';
import { selectConversionRateBySymbol } from '../../../../selectors/currencyRateController';
import { selectPerpsBalances } from '../selectors/perpsController';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

interface UsePerpsPortfolioBalanceOptions {
  /** Fetch balance on mount (for wallet view) */
  fetchOnMount?: boolean;
}

/**
 * Hook for getting aggregated Perps balance across all providers
 * Returns balance in display currency for portfolio display
 *
 * @param options - Configuration options
 * @param options.fetchOnMount - Whether to fetch balance once on mount (for wallet view)
 */
export function usePerpsPortfolioBalance(
  options: UsePerpsPortfolioBalanceOptions = {},
) {
  const { fetchOnMount = false } = options;
  const hasFetched = useRef(false);
  // Get USD to display currency conversion rate
  const usdConversionRate = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, 'usd'),
  );

  // Get all perps balances from state
  const perpsBalances = useSelector(selectPerpsBalances);

  // Fetch initial balance on mount if requested
  useEffect(() => {
    if (!fetchOnMount || hasFetched.current) return;

    const fetchInitialBalance = async () => {
      try {
        const controller = Engine.context.PerpsController;

        // Check if perps is initialized
        const state = controller.state;

        if (!state.isEligible) {
          // User not eligible for perps, skip fetching
          return;
        }

        // Fetch account state which will update perpsBalances
        await controller.getAccountState();
      } catch (error) {
        // Silently fail - perps balance is optional
        DevLogger.log(
          'usePerpsPortfolioBalance: Failed to fetch initial balance',
          error,
        );
      }
    };

    hasFetched.current = true;
    fetchInitialBalance();
  }, [fetchOnMount]);

  // Calculate aggregated balance across all providers
  const { totalBalance, totalUnrealizedPnl, totalBalance1dAgo } =
    useMemo(() => {
      let totalBalanceUsd = new BigNumber(0);
      let totalPnlUsd = new BigNumber(0);
      let totalBalance1dAgoUsd = new BigNumber(0);

      Object.values(perpsBalances).forEach((providerBalance) => {
        if (providerBalance) {
          totalBalanceUsd = totalBalanceUsd.plus(
            providerBalance.totalValue || '0',
          );
          totalPnlUsd = totalPnlUsd.plus(providerBalance.unrealizedPnl || '0');
          totalBalance1dAgoUsd = totalBalance1dAgoUsd.plus(
            providerBalance.accountValue1dAgo || '0',
          );
        }
      });

      const conversionRate = usdConversionRate || 1;
      const totalBalanceConverted = totalBalanceUsd
        .multipliedBy(conversionRate)
        .toNumber();
      const totalPnlConverted = totalPnlUsd
        .multipliedBy(conversionRate)
        .toNumber();
      const totalBalance1dAgoConverted = totalBalance1dAgoUsd
        .multipliedBy(conversionRate)
        .toNumber();

      return {
        totalBalance: totalBalanceConverted,
        totalUnrealizedPnl: totalPnlConverted,
        totalBalance1dAgo: totalBalance1dAgoConverted,
      };
    }, [perpsBalances, usdConversionRate]);

  return {
    // Current total account value in display currency (cash + positions)
    perpsBalance: totalBalance,
    // Account value 24h ago in display currency (for % change calculation)
    perpsBalance1dAgo: totalBalance1dAgo,
    // Current unrealized P&L from open positions in display currency
    unrealizedPnl: totalUnrealizedPnl,
    // Whether we have any perps data
    hasPerpsData: Object.keys(perpsBalances).length > 0,
    // Raw balances per provider (USD values)
    perpsBalances,
  };
}
