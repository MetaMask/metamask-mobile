import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex, createProjectLogger } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import Engine from '../../../../../core/Engine';
import { selectIsAssetsUnifyStateEnabled } from '../../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';

const log = createProjectLogger('add-token');

export interface AddTokenRequest {
  chainId: Hex;
  decimals: number;
  name: string;
  symbol: string;
  tokenAddress: Hex;
}

export function useAddTokenCallback(): (
  request: AddTokenRequest,
) => Promise<void> {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const accountId = evmAccount?.id;

  return useCallback(
    async ({ chainId, decimals, name, symbol, tokenAddress }) => {
      const { NetworkController, TokensController, AssetsController } =
        Engine.context;

      const networkClientId =
        NetworkController.findNetworkClientIdByChainId(chainId);

      await TokensController.addToken({
        address: tokenAddress,
        decimals,
        name,
        networkClientId,
        symbol,
      });

      if (isAssetsUnifyStateEnabled && accountId) {
        const caipChainId = toEvmCaipChainId(chainId);
        const caipAssetType = toAssetId(tokenAddress, caipChainId);

        if (caipAssetType) {
          await AssetsController.addCustomAsset(accountId, caipAssetType, {
            address: tokenAddress,
            chainId,
            decimals,
            name,
            symbol,
          });
        }
      }

      log('Added token', { tokenAddress, chainId });
    },
    [accountId, isAssetsUnifyStateEnabled],
  );
}
