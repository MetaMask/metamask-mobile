import type { ImageURISource } from 'react-native';
import { getAssetImageUrl } from '../../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

/**
 * Resolves the best available image source for a `BridgeToken` candidate.
 *
 * Order of preference:
 * 1. The token's own `image` URL (set for stablecoins and most ERC-20s).
 * 2. The MetaMask static token-icon CDN URL derived from the token address +
 * chain (covers native tokens — ETH, BNB, POL, etc. — whose `image` field
 * from `getNativeSourceToken` is often empty).
 * 3. `undefined`, in which case `AvatarToken` renders the symbol monogram.
 */
export const getBridgeTokenImageSource = (
  token: BridgeToken,
): ImageURISource | undefined => {
  if (token.image) {
    return { uri: token.image };
  }
  const fallback = getAssetImageUrl(token.address, token.chainId);
  return fallback ? { uri: fallback } : undefined;
};
