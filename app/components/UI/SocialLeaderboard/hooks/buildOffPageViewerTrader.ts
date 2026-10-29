import type { TraderProfileResponse } from '@metamask/social-controllers';
import type { TopTrader } from '../../../Views/Homepage/Sections/TopTraders/types';
import type {
  LeaderboardSort,
  SocialTimeframe,
} from '../../../Views/SocialLeaderboard/components/Filters';
import { toFoxiconAvatarUrl } from '../../../Views/SocialLeaderboard/MyProfileView/avatarPresets';
import { getTraderMetricDisplay } from '../../../Views/SocialLeaderboard/TopTradersView/traderMetric';
import type { RankedTrader } from '../types';

/**
 * Identity fields the signed-in profile already has. Live stats come from the
 * trader profile; these fill the name and the fox preset the profile API
 * stores separately from `imageUrl`.
 */
export interface OffPageViewerIdentity {
  profileId: string;
  displayName: string;
  handle: string;
  imageUrl?: string | null;
  avatarPresetId?: string | null;
  avatarBackgroundId?: string | null;
  linkedAccountAddress?: string | null;
}

export interface OffPageViewerTrader {
  trader: RankedTrader;
  /** The selected window has no PnL, so the card shows an empty state. */
  empty: boolean;
  /** ROI is absent, so the percent line stays hidden on the pinned card. */
  omitPercentage: boolean;
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

/**
 * An empty map is what the profile API sends when metadata has no breakdown.
 * That is "no data", not a zero on every chain. A map with keys is a real
 * breakdown: a requested chain missing from it counts as 0.
 */
const hasBreakdown = (
  perChain: Record<string, number> | undefined,
): perChain is Record<string, number> =>
  perChain != null && Object.keys(perChain).length > 0;

/**
 * Same chain rule as social-api `resolveChainScopedPnl`, except an empty
 * breakdown falls through to the global figure instead of summing to 0.
 * Summing an empty map is how a viewer with no trades was pinned as $0.
 */
const resolveWindowPnl = (
  perChain: Record<string, number> | undefined,
  globalValue: number | null | undefined,
  chains: readonly string[],
): number | null => {
  if (chains.length > 0 && hasBreakdown(perChain)) {
    return chains.reduce((sum, chain) => sum + (perChain[chain] ?? 0), 0);
  }
  return isFiniteNumber(globalValue) ? globalValue : null;
};

/**
 * Same rule as social-api `resolveRoiPercent*`: per-chain ROI only when the
 * request is a single chain (Perps). All and Tokens use the global percent.
 * Values are already whole percents.
 */
const resolveWindowRoi = (
  perChain: Record<string, number | null> | undefined,
  globalValue: number | null | undefined,
  chains: readonly string[],
): number | null => {
  if (chains.length === 1) {
    const perChainValue = perChain?.[chains[0]];
    if (perChainValue !== undefined) {
      return isFiniteNumber(perChainValue) ? perChainValue : null;
    }
  }
  return isFiniteNumber(globalValue) ? globalValue : null;
};

const resolveAvatarUri = (
  liveImageUrl: string | null | undefined,
  identity: OffPageViewerIdentity,
): string | undefined => {
  if (liveImageUrl) {
    return liveImageUrl;
  }
  if (identity.imageUrl) {
    return identity.imageUrl;
  }
  if (identity.avatarPresetId && identity.avatarBackgroundId) {
    return toFoxiconAvatarUrl(
      identity.avatarPresetId,
      identity.avatarBackgroundId,
    );
  }
  return undefined;
};

const toWholePercent = (fraction: number | null | undefined): number | null =>
  isFiniteNumber(fraction) ? fraction * 100 : null;

/**
 * Builds the pinned card for a viewer who is not on the loaded leaderboard
 * page. Rank stays unknown; the row leaves that column blank.
 */
export const buildOffPageViewerTrader = ({
  identity,
  live,
  sort,
  timeframe,
  chains,
}: {
  identity: OffPageViewerIdentity;
  live: TraderProfileResponse;
  sort: LeaderboardSort;
  timeframe: SocialTimeframe;
  chains: readonly string[];
}): OffPageViewerTrader => {
  const is30d = timeframe === '30d';
  const breakdown = live.perChainBreakdown;
  const pnl = resolveWindowPnl(
    is30d ? breakdown.perChainPnl : breakdown.perChainPnl7d,
    is30d ? live.stats.pnl30d : live.stats.pnl7d,
    chains,
  );
  const roi = resolveWindowRoi(
    is30d ? breakdown.perChainRoi : breakdown.perChainRoi7d,
    is30d ? live.stats.roiPercent30d : live.stats.roiPercent7d,
    chains,
  );
  const pnl30d = resolveWindowPnl(
    breakdown.perChainPnl,
    live.stats.pnl30d,
    chains,
  );
  const empty = pnl == null;
  const synthetic: TopTrader = {
    id: identity.profileId,
    address: live.profile.address || identity.linkedAccountAddress || '',
    rank: 0,
    overallRank: 0,
    username: identity.displayName || identity.handle || live.profile.name,
    avatarUri: resolveAvatarUri(live.profile.imageUrl, identity),
    percentageChange: roi ?? 0,
    pnlValue: pnl ?? 0,
    pnl30d,
    winRatePercent: toWholePercent(
      is30d ? live.stats.winRate30d : live.stats.winRate7d,
    ),
    pnlPerChain:
      (is30d ? breakdown.perChainPnl : breakdown.perChainPnl7d) ?? {},
    followerCount: live.followerCount,
    isFollowing: false,
  };

  return {
    trader: {
      ...synthetic,
      displayMetric: getTraderMetricDisplay(synthetic, sort),
    },
    empty,
    omitPercentage: roi == null,
  };
};
