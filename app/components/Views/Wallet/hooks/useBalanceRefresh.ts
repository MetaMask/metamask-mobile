import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { selectUseNftDetection } from '../../../../selectors/preferencesController';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { FUNGIBLE_ASSET_TYPES } from '../../../../core/Assets/accountGroupAssetLoader';

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

  const selectedAccountGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );

  const refreshBalance = useCallback(async () => {
    const { AssetsController, NftDetectionController } = Engine.context;

    try {
      const refreshTasks: Promise<unknown>[] = [
        AssetsController.getAssets([...selectedAccountGroupAccounts], {
          forceUpdate: true,
          chainIds: evmChainIds.map(toEvmCaipChainId),
          assetTypes: FUNGIBLE_ASSET_TYPES,
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
  }, [selectedAccountGroupAccounts, evmChainIds, isNftDetectionEnabled]);

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
