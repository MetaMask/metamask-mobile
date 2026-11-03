import type { CaipAssetType } from '@metamask/utils';
import type { SocialAssetClass } from '../../SocialFeed/types';
import {
  ALL_CHAINS,
  PERP_CHAINS,
  SPOT_CHAINS,
} from '../../../Views/shared/top-traders-constants';

/**
 * Which ranking to show. Mirrors `SocialFeedSource` so a host that shows both
 * a feed and a leaderboard for the same asset builds both the same way.
 */
export type SocialLeaderboardSource =
  /** Every tracked trader, optionally narrowed to spot tokens or perps. */
  | { kind: 'all'; assetClass?: SocialAssetClass }
  /** Traders ranked on one spot token, identified by its CAIP-19 asset id. */
  | { kind: 'token'; assetId: CaipAssetType }
  /** Traders ranked on one Hyperliquid perp market (`BTC`, `xyz:NVDA`). */
  | { kind: 'perp'; symbol: string };

/** What a source resolves to once the perps flag is taken into account. */
export type SocialLeaderboardResolution =
  /** Fetch `SocialService:fetchLeaderboard` with these chains. */
  | { status: 'ready'; chains: string[] }
  /** The social API has no ranking for this source yet. */
  | { status: 'unavailable' }
  /** The source is perps and perps are switched off; render nothing. */
  | { status: 'hidden' };

/**
 * `all` is the combined ranking and `tokens` the spot-only one. These arrays
 * are part of the query key the homepage carousel and V0 leaderboard share.
 */
const CHAINS_BY_ASSET_CLASS: Record<SocialAssetClass, string[]> = {
  all: ALL_CHAINS,
  tokens: SPOT_CHAINS,
  perps: PERP_CHAINS,
};

/** Asset class a source belongs to, as reported in analytics. */
export const getLeaderboardAssetClass = (
  source: SocialLeaderboardSource,
): SocialAssetClass => {
  switch (source.kind) {
    case 'all':
      return source.assetClass ?? 'all';
    case 'token':
      return 'tokens';
    case 'perp':
      return 'perps';
    default:
      return source satisfies never;
  }
};

/**
 * Resolves a source to the leaderboard request that serves it.
 *
 * `fetchLeaderboard` only filters by chain, so single-asset sources resolve to
 * `unavailable` until social-api ranks traders per token. With perps off the
 * combined ranking falls back to spot chains, as the V0 leaderboard does.
 */
export const resolveSocialLeaderboardSource = (
  source: SocialLeaderboardSource,
  { isPerpsEnabled }: { isPerpsEnabled: boolean },
): SocialLeaderboardResolution => {
  const assetClass = getLeaderboardAssetClass(source);
  if (assetClass === 'perps' && !isPerpsEnabled) {
    return { status: 'hidden' };
  }
  if (source.kind !== 'all') {
    return { status: 'unavailable' };
  }
  if (assetClass === 'all' && !isPerpsEnabled) {
    return { status: 'ready', chains: SPOT_CHAINS };
  }
  return { status: 'ready', chains: CHAINS_BY_ASSET_CLASS[assetClass] };
};
