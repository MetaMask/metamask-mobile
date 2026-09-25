import { Hex } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';

import Engine from '../../../../../core/Engine';
import { safeToChecksumAddress } from '../../../../../util/address';
import { toAssetId } from '../../../Bridge/hooks/useAssetMetadata/utils';

interface CounterTokenSnapshot {
  chainId?: Hex;
  token?: {
    address?: string;
    decimals?: number;
    symbol?: string;
    name?: string;
  };
}

/**
 * Registers the lending counter-token in unified assets state after a
 * first-time deposit/withdrawal, so the asset overview can resolve it
 * immediately. Failures are logged and swallowed — confirmation is never
 * blocked by token registration.
 */
export const registerLendingCounterToken = (
  accountId: string,
  tokenSnapshot: CounterTokenSnapshot | undefined,
  contextSymbol: string,
): void => {
  try {
    const counterTokenChainId = tokenSnapshot?.chainId as Hex;
    const counterTokenAddress = tokenSnapshot?.token?.address || '';
    // toAssetId embeds the address verbatim, so checksum it first to match
    // the normalized (checksummed) ids AssetsController stores.
    const checksummedAddress =
      safeToChecksumAddress(counterTokenAddress) ?? counterTokenAddress;
    const caipChainId = toEvmCaipChainId(counterTokenChainId);
    const caipAssetType = toAssetId(checksummedAddress, caipChainId);

    if (caipAssetType) {
      Engine.context.AssetsController.addCustomAsset(accountId, caipAssetType, {
        decimals: tokenSnapshot?.token?.decimals || 0,
        symbol: tokenSnapshot?.token?.symbol || '',
        address: checksummedAddress,
        name: tokenSnapshot?.token?.name || '',
        chainId: counterTokenChainId,
      }).catch(console.error);
    }
  } catch (error) {
    console.error(
      error,
      `error adding counter-token for ${contextSymbol} on confirmation`,
    );
  }
};
