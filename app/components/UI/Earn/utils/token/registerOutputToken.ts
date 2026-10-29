import { Hex } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';

import Engine from '../../../../../core/Engine';
import { safeToChecksumAddress } from '../../../../../util/address';
import { toAssetId } from '../../../Bridge/hooks/useAssetMetadata/utils';

interface OutputTokenSnapshot {
  chainId?: Hex;
  token?: {
    address?: string;
    decimals?: number;
    symbol?: string;
    name?: string;
  };
}

/**
 * Registers the lending output token (the receipt token received from a
 * deposit/withdrawal) in unified assets state after a first-time
 * deposit/withdrawal, so the asset overview can resolve it immediately.
 * Failures are logged and swallowed — confirmation is never blocked by token
 * registration.
 */
export const registerLendingOutputToken = (
  accountId: string,
  tokenSnapshot: OutputTokenSnapshot | undefined,
  contextSymbol: string,
): void => {
  try {
    const outputTokenChainId = tokenSnapshot?.chainId as Hex;
    const outputTokenAddress = tokenSnapshot?.token?.address || '';
    // toAssetId embeds the address verbatim, so checksum it first to match
    // the normalized (checksummed) ids AssetsController stores.
    const checksummedAddress =
      safeToChecksumAddress(outputTokenAddress) ?? outputTokenAddress;
    const caipChainId = toEvmCaipChainId(outputTokenChainId);
    const caipAssetType = toAssetId(checksummedAddress, caipChainId);

    if (caipAssetType) {
      Engine.context.AssetsController.addCustomAsset(accountId, caipAssetType, {
        decimals: tokenSnapshot?.token?.decimals || 0,
        symbol: tokenSnapshot?.token?.symbol || '',
        address: checksummedAddress,
        name: tokenSnapshot?.token?.name || '',
        chainId: outputTokenChainId,
      }).catch(console.error);
    }
  } catch (error) {
    console.error(
      error,
      `error adding output token for ${contextSymbol} on confirmation`,
    );
  }
};
