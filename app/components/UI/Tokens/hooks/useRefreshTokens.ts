import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { isEvmAccountType } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectEnabledNetworks } from '../../../../selectors/networkEnablementController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { performEvmTokenRefresh } from '../util/tokenRefreshUtils';
import { FUNGIBLE_ASSET_TYPES } from '../../../../core/Assets/accountGroupAssetLoader';

const refreshUnifiedAssets = async (
  accounts: readonly InternalAccount[],
  enabledChainIds: ReturnType<typeof selectEnabledNetworks>,
) => {
  if (accounts.length === 0) {
    return;
  }

  try {
    await Engine.context.AssetsController.getAssets([...accounts], {
      forceUpdate: true,
      chainIds: enabledChainIds,
      assetTypes: FUNGIBLE_ASSET_TYPES,
    });
  } catch (error) {
    Logger.error(
      error as Error,
      'useRefreshTokens: AssetsController.getAssets failed',
    );
  }
};

const refreshLegacyTokenControllers = async (
  accounts: readonly InternalAccount[],
  evmNetworkConfigurationsByChainId: Parameters<
    typeof performEvmTokenRefresh
  >[0],
) => {
  const nonEvmAccounts = accounts.filter(
    (account) => !isEvmAccountType(account.type),
  );

  await Promise.all([
    ...nonEvmAccounts.map(async (account) => {
      try {
        await Engine.context.MultichainBalancesController.updateBalance(
          account.id,
        );
      } catch (error) {
        Logger.error(
          error as Error,
          `useRefreshTokens: failed to refresh balance for non-EVM account ${account.id}`,
        );
      }
    }),
    performEvmTokenRefresh(evmNetworkConfigurationsByChainId),
  ]);
};

/**
 * Refreshes tokens for every account in the selected group.
 *
 * When the unified assets state flag is enabled, force-refreshes
 * `AssetsController` only.
 *
 * Otherwise triggers `MultichainBalancesController.updateBalance` for every
 * non-EVM account in the group and runs the EVM token detection / balance /
 * rate refresh in parallel.
 */
export const useRefreshTokens = () => {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const selectedAccountGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const enabledChainIds = useSelector(selectEnabledNetworks);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const refresh = useCallback(async () => {
    if (isAssetsUnifyStateEnabled) {
      await refreshUnifiedAssets(selectedAccountGroupAccounts, enabledChainIds);
      return;
    }

    await refreshLegacyTokenControllers(
      selectedAccountGroupAccounts,
      evmNetworkConfigurationsByChainId ?? {},
    );
  }, [
    isAssetsUnifyStateEnabled,
    selectedAccountGroupAccounts,
    enabledChainIds,
    evmNetworkConfigurationsByChainId,
  ]);

  return { refresh };
};
