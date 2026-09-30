import type { TraderProfileResponse } from '@metamask/social-controllers';
import type { MySocialProfile } from '../hooks/useMyProfile';

export const traderProfileResponseToMySocialProfile = (
  live: TraderProfileResponse,
  extras?: { handle?: string; shareUrl?: string },
): MySocialProfile => ({
  profileId: live.profile.profileId,
  displayName: live.profile.name,
  handle: extras?.handle ?? live.profile.name,
  imageUrl: live.profile.imageUrl,
  rankingTag: live.rankingTag ?? null,
  xHandle: live.socialHandles?.twitter ?? null,
  followerCount: live.followerCount,
  followingCount: live.followingCount,
  shareUrl: extras?.shareUrl ?? '',
  winRatePercent:
    live.stats.winRate30d != null ? live.stats.winRate30d * 100 : null,
  pnlUsd: live.stats.pnl30d ?? null,
  timesCopied: live.copytradedAllTime?.count ?? null,
  volumeUsd30d: live.stats.volumeUsd30d ?? null,
  tradeCount30d: live.stats.tradeCount30d ?? null,
  linkedAccountAddress: live.profile.address,
});
