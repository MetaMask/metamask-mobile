import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectTokensByChainIdAndAddress } from '../../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectIsAssetsUnifyStateEnabled } from '../../../../../selectors/featureFlagController/assetsUnifyState';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { Hex, createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('add-token');

export function useAddToken({
  chainId,
  decimals,
  name,
  symbol,
  tokenAddress,
}: {
  chainId: Hex;
  decimals: number;
  name: string;
  symbol: string;
  tokenAddress: Hex;
}) {
  const { NetworkController, TokensController, AssetsController } =
    Engine.context;

  const addedTokens = useSelector((state) =>
    selectTokensByChainIdAndAddress(state, chainId),
  );

  const hasToken = Object.values(addedTokens).some(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );

  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const accountId = evmAccount?.id;

  const { error } = useAsyncResult(async () => {
    if (hasToken) {
      return;
    }

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
  }, [hasToken, isAssetsUnifyStateEnabled, accountId]);

  if (error) {
    log('Failed', { tokenAddress, chainId, error });
  }
}
