import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectNativeNetworkCurrencies,
} from '../../../../selectors/networkController';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { selectUseNftDetection } from '../../../../selectors/preferencesController';

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
  const { popularEvmNetworks: evmChainIds } = useNetworkEnablement();

  const isNftDetectionEnabled = useSelector(selectUseNftDetection);

  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

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
      NftDetectionController,
    } = Engine.context;
    const networkClientIds = Object.values(evmNetworkConfigurationsFiltered)
      .map(
        ({ defaultRpcEndpointIndex, rpcEndpoints }) =>
          rpcEndpoints[defaultRpcEndpointIndex]?.networkClientId,
      )
      .filter((id): id is string => Boolean(id));

    try {
      const refreshTasks: Promise<unknown>[] = [
        AccountTrackerController.refresh(networkClientIds),
        CurrencyRateController.updateExchangeRate(nativeCurrencies),
        TokenDetectionController.detectTokens({
          chainIds: evmChainIds,
        }),
        TokenBalancesController.updateBalances({
          chainIds: evmChainIds,
        }),
      ];

      if (isNftDetectionEnabled) {
        refreshTasks.push(
          NftDetectionController.detectNfts(evmChainIds, {
            firstPageOnly: true,
          }),
        );
      }

      await Promise.race([
        Promise.allSettled(refreshTasks),
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
  }, [
    evmNetworkConfigurationsFiltered,
    evmChainIds,
    nativeCurrencies,
    isNftDetectionEnabled,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  }, [refreshBalance]);

  return {
    refreshBalance,
    handleRefresh,
    refreshing,
  };
};
