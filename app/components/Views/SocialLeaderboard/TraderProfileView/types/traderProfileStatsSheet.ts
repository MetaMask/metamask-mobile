import type {
  TraderProfileResponse,
  TraderStats,
} from '@metamask/social-controllers';

/**
 * Fields the stats sheet needs from social-api that land in Core
 * `social-controllers` after the published bump. Extra keys already ride on
 * the JSON (`type()` Superstruct ignores them); this keeps Mobile compiling
 * against the current package.
 */
export interface CopytradedAllTimeStats {
  count: number;
  volumeUSD: number;
  distinctActors: number;
}

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
