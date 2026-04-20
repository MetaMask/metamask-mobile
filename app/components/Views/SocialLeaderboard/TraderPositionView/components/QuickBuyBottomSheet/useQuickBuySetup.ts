import { useMemo } from 'react';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import type { Position } from '@metamask/social-controllers';
import { useAssetMetadata } from '../../../../../UI/Bridge/hooks/useAssetMetadata';
import { chainNameToId } from '../../../utils/chainMapping';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

export interface QuickBuySetupResult {
  /** The destination chain ID (hex or CAIP) for this position's chain */
  chainId: Hex | CaipChainId | undefined;
  /** The destination token (what the user is buying) */
  destToken: BridgeToken | undefined;
  /** Whether token metadata is still loading */
  isLoading: boolean;
  /** Whether the chain is unsupported */
  isUnsupportedChain: boolean;
}

/**
 * Resolves a Position from the Social API into a destination BridgeToken
 * that can be used by the Bridge/Swaps system.
 *
 * Source token selection is handled separately by useSourceTokenOptions.
 */
export const useQuickBuySetup = (
  position: Position | null,
): QuickBuySetupResult => {
  // Destination chain from the position — hex for EVM, CAIP for non-EVM
  const destChainId = useMemo(() => {
    if (!position) return undefined;
    const caipId = chainNameToId(position.chain);
    return caipId
      ? isNonEvmChainId(caipId)
        ? caipId
        : formatChainIdToHex(caipId)
      : undefined;
  }, [position]);

  const isUnsupportedChain = Boolean(position && !destChainId);

  // Fetch token metadata (decimals, image) from Token Metadata API for the dest token
  const { assetMetadata, pending: isMetadataLoading } = useAssetMetadata(
    position?.tokenAddress ?? '',
    Boolean(position && destChainId),
    destChainId,
  );

  // Build destination token (the token the user wants to buy)
  const destToken = useMemo<BridgeToken | undefined>(() => {
    if (!position || !destChainId) return undefined;

    if (assetMetadata) {
      return {
        address: isNonEvmChainId(destChainId)
          ? assetMetadata.address
          : position.tokenAddress,
        symbol: position.tokenSymbol,
        name: position.tokenName,
        decimals: assetMetadata.decimals,
        image: assetMetadata.image,
        chainId: destChainId,
      };
    }

    return undefined;
  }, [position, destChainId, assetMetadata]);

  return {
    chainId: destChainId,
    destToken,
    isLoading: isMetadataLoading,
    isUnsupportedChain,
  };
};
