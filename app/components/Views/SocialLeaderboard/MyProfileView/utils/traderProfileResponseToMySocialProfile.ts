import type { TraderProfileResponse } from '@metamask/social-controllers';
import type { MySocialProfile } from '../hooks/useMyProfile';
import { preferTraderAvatarUrl } from './preferTraderAvatarUrl';

export const traderProfileResponseToMySocialProfile = (
  live: TraderProfileResponse,
  extras?: { handle?: string; imageUrl?: string | null },
): MySocialProfile => ({
  profileId: live.profile.profileId,
  displayName: live.profile.displayName?.trim() || live.profile.name,
  handle: extras?.handle ?? live.profile.name,
  bio: live.profile.bio || null,
  imageUrl: preferTraderAvatarUrl(live.profile.imageUrl, extras?.imageUrl),
  rankingTag: live.rankingTag ?? null,
  xHandle: live.socialHandles?.twitter ?? null,
  followerCount: live.followerCount,
  followingCount: live.followingCount,
  winRatePercent:
    live.stats.winRate30d != null ? live.stats.winRate30d * 100 : null,
  pnlUsd: live.stats.pnl30d ?? null,
  linkedAccountAddress: live.profile.address,
  shareTradingActivity: live.profile.tradingPrivacy
    ? live.profile.tradingPrivacy === 'public'
    : null,
  joinedAt: live.profile.createdAt ?? null,
});
