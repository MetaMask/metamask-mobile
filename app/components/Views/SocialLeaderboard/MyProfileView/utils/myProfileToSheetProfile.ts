import type { TraderProfileWithSheetStats } from '../../TraderProfileView/types/traderProfileStatsSheet';
import type { MySocialProfile } from '../hooks/useMyProfile';

/** Best-effort parse for mock labels like `4d` until median minutes come from the API. */
function holdTimeLabelToMinutes(
  label: string | null | undefined,
): number | null {
  if (!label) {
    return null;
  }
  const trimmed = label.trim();
  const dayMatch = /^(\d+(?:\.\d+)?)d$/iu.exec(trimmed);
  if (dayMatch) {
    return Math.round(parseFloat(dayMatch[1]) * 24 * 60);
  }
  return null;
}

export function myProfileToSheetProfile(
  profile: MySocialProfile,
): TraderProfileWithSheetStats {
  const address = profile.linkedAccountAddress ?? '';

  return {
    profile: {
      profileId: profile.profileId,
      address,
      allAddresses: address ? [address] : [],
      name: profile.displayName,
      imageUrl: profile.imageUrl ?? null,
    },
    stats: {
      pnl30d: profile.pnlUsd ?? null,
      winRate30d:
        profile.winRatePercent != null ? profile.winRatePercent / 100 : null,
      medianHoldMinutes: holdTimeLabelToMinutes(profile.holdTimeLabel),
      tradeCount30d: null,
      volumeUsd30d: null,
    },
    perChainBreakdown: {
      perChainPnl: {},
      perChainRoi: {},
      perChainVolume: {},
    },
    socialHandles: {
      twitter: profile.xHandle ?? undefined,
    },
    followerCount: profile.followerCount ?? 0,
    followingCount: profile.followingCount ?? 0,
    copytradedAllTime:
      profile.timesCopied != null
        ? {
            count: profile.timesCopied,
            volumeUSD: 0,
            distinctActors: 0,
          }
        : undefined,
  };
}
