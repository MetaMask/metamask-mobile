import type {
  TraderProfileResponse,
  TraderStats,
} from '@metamask/social-controllers';

export type TraderStatsWithVolume = TraderStats & {
  volumeUsd30d?: number | null;
};

export type TraderProfileWithSheetStats = TraderProfileResponse & {
  stats: TraderStatsWithVolume;
};

export function getCopytradedCount(
  profile: TraderProfileWithSheetStats,
): number {
  return profile.copytradedAllTime?.count ?? 0;
}
