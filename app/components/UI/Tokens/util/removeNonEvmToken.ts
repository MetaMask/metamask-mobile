import { CaipAssetType, CaipChainId } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

interface RemoveNonEvmTokenProps {
  tokenAddress: string;
  tokenChainId: string;
  selectInternalAccountByScope: (
    chainId: CaipChainId,
  ) => InternalAccount | undefined;
}

export const removeNonEvmToken = async ({
  tokenAddress,
  tokenChainId,
  selectInternalAccountByScope,
}: RemoveNonEvmTokenProps) => {
  const selectedNonEvmAccount = selectInternalAccountByScope(
    tokenChainId as CaipChainId,
  );

  if (!selectedNonEvmAccount) {
    Logger.log('Tokens List: No account ID found');
    return;
  }

  const { MultichainAssetsController } = Engine.context;
  await MultichainAssetsController.ignoreAssets(
    [tokenAddress as CaipAssetType],
    selectedNonEvmAccount.id,
  );
};
