import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import type { TokenView } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import type { PositionTokenAvatarData } from '../../../SocialFeed/components/PositionTokenAvatar';
import { HYPERLIQUID_CHAIN_NAME } from '../../../SocialFeed/utils/perp';

/**
 * The identifier after the key's source prefix. `perps:BTC` → `BTC`,
 * `swaps:eip155:1/erc20:0x…` → the CAIP-19 asset id. Splits on the first
 * colon only, so a CAIP id's own colons stay intact.
 */
function tokenIdentifier(key: string): string {
  const separator = key.indexOf(':');
  return separator >= 0 ? key.slice(separator + 1) : key;
}

/**
 * The shape `PositionTokenAvatar` needs for one commission token.
 *
 * A perps key is a Hyperliquid market symbol, which that avatar renders with
 * `PerpsTokenLogo`. A swaps key is a CAIP-19 asset id, which it renders from
 * the MetaMask token-image CDN. Anything else keeps the letter fallback.
 */
export function commissionTokenAvatar(
  token: TokenView,
): PositionTokenAvatarData {
  const identifier = tokenIdentifier(token.key);

  if (token.source === 'PERPS') {
    return {
      positionId: token.key,
      chain: HYPERLIQUID_CHAIN_NAME,
      tokenAddress: '',
      tokenImageUrl: null,
      tokenSymbol: token.symbol ?? identifier,
    };
  }

  if (isCaipAssetType(identifier)) {
    const { chainId } = parseCaipAssetType(identifier);
    return {
      positionId: token.key,
      chain: chainId,
      tokenAddress: identifier,
      tokenImageUrl: null,
      tokenSymbol: token.symbol ?? identifier,
    };
  }

  return {
    positionId: token.key,
    chain: '',
    tokenAddress: '',
    tokenImageUrl: null,
    tokenSymbol: token.symbol ?? token.key,
  };
}
