import type { TraderProfileWithSheetStats } from '../../TraderProfileView/types/traderProfileStatsSheet';
import type { MySocialProfile } from '../hooks/useMyProfile';

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
      medianHoldMinutes: null,
      tradeCount30d: profile.tradeCount30d ?? null,
      volumeUsd30d: profile.volumeUsd30d ?? null,
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
    copytradedAllTime: {
      count: profile.timesCopied ?? 0,
      volumeUSD: 0,
      distinctActors: 0,
    },
  };
}
