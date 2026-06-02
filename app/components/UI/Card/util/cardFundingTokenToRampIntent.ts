import type { CardFundingToken } from '../types';
import type { RampIntent } from '../../Ramp/types';

/**
 * Maps a MetaMask Card priority funding token to a ramps {@link RampIntent}
 * for unified buy (UB2). ERC-20 tokens use `eip155:…/erc20:0x…`. When
 * `address` is missing, returns an empty intent so `goToBuy` opens token selection.
 */
export function cardFundingTokenToRampIntent(
  token: CardFundingToken | undefined,
): RampIntent {
  if (!token?.address) {
    return {};
  }

  const assetId = `${token.caipChainId}/erc20:${token.address.toLowerCase()}`;
  return { assetId };
}
