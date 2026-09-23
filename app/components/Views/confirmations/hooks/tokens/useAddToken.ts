import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectTokensByChainIdAndAddress } from '../../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
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
  const { AssetsController } = Engine.context;

  const addedTokens = useSelector((state) =>
    selectTokensByChainIdAndAddress(state, chainId),
  );

  const hasToken = Object.values(addedTokens).some(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );

  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const accountId = evmAccount?.id;

  const { error } = useAsyncResult(async () => {
    if (hasToken || !accountId) {
      return;
    }

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

    log('Added token', { tokenAddress, chainId });
  }, [hasToken, accountId]);

  if (error) {
    log('Failed', { tokenAddress, chainId, error });
  }
}
