import type { Position } from '@metamask/social-controllers';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { chainNameToId } from '../utils/chainMapping';
import { getSupportedXyzPerpMarketSymbol, isPerpPosition } from '../utils/perp';
import { SocialLeaderboardEventProperties } from './socialLeaderboardEvents';

export type FollowTradingTokenContext = {
  [SocialLeaderboardEventProperties.TRADER_ADDRESS]: string;
  [SocialLeaderboardEventProperties.ASSET_NAME]: string;
  [SocialLeaderboardEventProperties.CHAIN_NAME]: string;
} & (
  | {
      [SocialLeaderboardEventProperties.CAIP19]: string;
      [SocialLeaderboardEventProperties.PERPS_MARKET]?: never;
    }
  | {
      [SocialLeaderboardEventProperties.PERPS_MARKET]: string;
      [SocialLeaderboardEventProperties.CAIP19]?: never;
    }
);

/**
 * Builds the shared property bag for follow-trading token analytics events.
 * Spot positions send `caip19`; perp positions send `perps_market` (resolved
 * tradable symbol). Returns null when `traderAddress` is missing or the
 * position identifier cannot be resolved.
 */
export function buildFollowTradingTokenContext(
  position: Pick<Position, 'chain' | 'tokenAddress' | 'tokenSymbol'> &
    Parameters<typeof isPerpPosition>[0],
  traderAddress: string | undefined,
): FollowTradingTokenContext | null {
  if (!traderAddress) {
    return null;
  }

  const base = {
    [SocialLeaderboardEventProperties.TRADER_ADDRESS]: traderAddress,
    [SocialLeaderboardEventProperties.ASSET_NAME]: position.tokenSymbol,
    [SocialLeaderboardEventProperties.CHAIN_NAME]: position.chain.toLowerCase(),
  };

  if (isPerpPosition(position)) {
    const { targetSymbol } = getSupportedXyzPerpMarketSymbol(
      position.tokenSymbol,
    );
    if (!targetSymbol) {
      return null;
    }
    return {
      ...base,
      [SocialLeaderboardEventProperties.PERPS_MARKET]: targetSymbol,
    };
  }

  const caipChainId = chainNameToId(position.chain);
  const caip19 = caipChainId
    ? (toAssetId(position.tokenAddress, caipChainId) ?? '')
    : '';
  if (!caip19) {
    return null;
  }

  return {
    ...base,
    [SocialLeaderboardEventProperties.CAIP19]: caip19,
  };
}

/**
 * Picks only the global identifier fields from a follow-trading context for
 * dismissed events (trader_address + chain_name + caip19 or perps_market).
 */
export function pickFollowTradingDismissedProperties(
  context: FollowTradingTokenContext,
): Pick<
  FollowTradingTokenContext,
  | typeof SocialLeaderboardEventProperties.TRADER_ADDRESS
  | typeof SocialLeaderboardEventProperties.CHAIN_NAME
  | typeof SocialLeaderboardEventProperties.CAIP19
  | typeof SocialLeaderboardEventProperties.PERPS_MARKET
> {
  if (SocialLeaderboardEventProperties.PERPS_MARKET in context) {
    return {
      [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
        context[SocialLeaderboardEventProperties.TRADER_ADDRESS],
      [SocialLeaderboardEventProperties.CHAIN_NAME]:
        context[SocialLeaderboardEventProperties.CHAIN_NAME],
      [SocialLeaderboardEventProperties.PERPS_MARKET]:
        context[SocialLeaderboardEventProperties.PERPS_MARKET],
    };
  }

  return {
    [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
      context[SocialLeaderboardEventProperties.TRADER_ADDRESS],
    [SocialLeaderboardEventProperties.CHAIN_NAME]:
      context[SocialLeaderboardEventProperties.CHAIN_NAME],
    [SocialLeaderboardEventProperties.CAIP19]:
      context[SocialLeaderboardEventProperties.CAIP19],
  };
}
