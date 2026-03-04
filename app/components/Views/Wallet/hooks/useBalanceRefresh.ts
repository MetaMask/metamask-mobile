import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectNativeNetworkCurrencies,
} from '../../../../selectors/networkController';

const REFRESH_TIMEOUT_MS = 5000;

/**
 * Hook to manage balance refresh functionality for the Wallet screen.
 * Handles refreshing account balances and currency exchange rates.
 * @returns Object containing:
 * - refreshBalance: Function to refresh balance without managing loading state
 * - handleRefresh: Function to refresh balance with loading state management
 * - refreshing: Boolean indicating if a refresh is in progress.
 */
export const useBalanceRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);

  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nativeCurrencies = useSelector(selectNativeNetworkCurrencies);

  const refreshBalance = useCallback(async () => {
    const { AccountTrackerController, CurrencyRateController } = Engine.context;
    const networkClientIds = Object.values(evmNetworkConfigurations)
      .map(
        ({ defaultRpcEndpointIndex, rpcEndpoints }) =>
          rpcEndpoints[defaultRpcEndpointIndex]?.networkClientId,
      )
      .filter((id): id is string => Boolean(id));

    try {
      await Promise.race([
        Promise.allSettled([
          AccountTrackerController.refresh(networkClientIds),
          CurrencyRateController.updateExchangeRate(nativeCurrencies),
        ]),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Balance refresh timed out')),
            REFRESH_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (error) {
      Logger.error(error as Error, 'Error refreshing balance');
    }
  }, [evmNetworkConfigurations, nativeCurrencies]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBalance]);

  return {
    refreshBalance,
    handleRefresh,
    refreshing,
  };
};
