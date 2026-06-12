import type { ImageURISource } from 'react-native';
import {
  getNativeAssetForChainId,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { getAssetImageUrl } from '../../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

/**
 * Resolves the best available image source for a `BridgeToken` candidate.
 *
 * Order of preference:
 * 1. The token's own `image` URL (set for stablecoins and most ERC-20s).
 * 2. The MetaMask static token-icon CDN URL derived from the asset id + chain.
 * Native tokens (ETH, BNB, POL, SOL, etc.) resolve through their canonical
 * SLIP-44 asset id (e.g. `eip155:59144/slip44:60`) — the zero-address
 * `erc20:0x0…0` path only serves a real icon on a handful of chains.
 * 3. `undefined`, in which case `AvatarToken` renders the symbol monogram.
 */
export const getBridgeTokenImageSource = (
  token: BridgeToken,
): ImageURISource | undefined => {
  if (token.image) {
    return { uri: token.image };
  }

  let assetId: string = token.address;
  if (isNativeAddress(token.address)) {
    try {
      assetId =
        getNativeAssetForChainId(token.chainId)?.assetId ?? token.address;
    } catch {
      assetId = token.address;
    }
  }

  const fallback = getAssetImageUrl(assetId, token.chainId);
  return fallback ? { uri: fallback } : undefined;
};
