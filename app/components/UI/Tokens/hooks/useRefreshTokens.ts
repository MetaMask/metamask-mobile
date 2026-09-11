import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectEnabledNetworks } from '../../../../selectors/networkEnablementController';
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

/**
 * Refreshes tokens for every account in the selected group by
 * force-refreshing `AssetsController`.
 */
export const useRefreshTokens = () => {
  const selectedAccountGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const enabledChainIds = useSelector(selectEnabledNetworks);

  const refresh = useCallback(async () => {
    await refreshUnifiedAssets(selectedAccountGroupAccounts, enabledChainIds);
  }, [selectedAccountGroupAccounts, enabledChainIds]);

  return { refresh };
};
