import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectNativeNetworkCurrencies,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';

const REFRESH_TIMEOUT_MS = 5000;
const REFRESH_TIMEOUT_ERROR_MESSAGE = 'Balance refresh timed out';

const isRefreshTimeoutError = (error: unknown): error is Error =>
  error instanceof Error && error.message === REFRESH_TIMEOUT_ERROR_MESSAGE;

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
  const { listPopularEvmNetworks } = useNetworkEnablement();

  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const evmChainIds = useMemo(
    () => listPopularEvmNetworks(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [networkConfigurations],
  );

  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  // Only refresh balance for popular EVM chains.
  const evmNetworkConfigurationsFiltered = useMemo(() => {
    const allowed = new Set<string>(evmChainIds);
    return Object.fromEntries(
      Object.entries(evmNetworkConfigurations).filter(([chainId]) =>
        allowed.has(chainId),
      ),
    );
  }, [evmNetworkConfigurations, evmChainIds]);

  const nativeCurrencies = useSelector(selectNativeNetworkCurrencies);

  const refreshBalance = useCallback(async () => {
    const {
      AccountTrackerController,
      CurrencyRateController,
      TokenBalancesController,
      TokenDetectionController,
    } = Engine.context;
    const networkClientIds = Object.values(evmNetworkConfigurationsFiltered)
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
          TokenDetectionController.detectTokens({ chainIds: evmChainIds }),
          TokenBalancesController.updateBalances({ chainIds: evmChainIds }),
        ]),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(REFRESH_TIMEOUT_ERROR_MESSAGE)),
            REFRESH_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (error) {
      if (isRefreshTimeoutError(error)) {
        Logger.log(REFRESH_TIMEOUT_ERROR_MESSAGE);
        return;
      }

      Logger.error(error as Error, 'Error refreshing balance');
    }
  }, [evmNetworkConfigurationsFiltered, evmChainIds, nativeCurrencies]);

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
