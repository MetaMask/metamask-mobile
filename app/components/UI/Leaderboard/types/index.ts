/**
 * Clicker Leaderboard API Types
 * Based on https://docs.clicker.xyz/api-reference/leaderboard
 */

/**
 * Format types for the reason value display
 */
export type ReasonFormat = 'currency' | 'percent' | 'text';

/**
 * Reason object explaining why a trader is ranked
 */
export interface LeaderboardReason {
  title: string;
  value: string;
  format: ReasonFormat;
}

/**
 * Profile images in different sizes
 */
export interface ProfileImages {
  /** Full-sized image URL */
  raw: string | null;
  /** 75x75 image URL */
  xs: string | null;
  /** 300x300 image URL */
  sm: string | null;
}

/**
 * Social and trading metadata for a profile
 */
export interface ProfileMetadata {
  farcasterUsername: string | null;
  farcasterId: number | null;
  lensHandle: string | null;
  ensName: string | null;
  twitterHandle: string | null;
  debankName: string | null;
  pumpName: string | null;
  commentCount30d: number | null;
  pnl30d: number | null;
  winRate30d: number | null;
  tradeCount30d: number | null;
  roiPercent30d: number | null;
  perAddressPnl30d?: Record<string, number>;
  perAddressRoiPercent30d?: Record<string, number | null>;
}

/**
 * Metrics for a specific partner context
 */
export interface PartnerMetrics {
  followingCount: number | null;
  followerCount: number | null;
}

/**
 * Comment metrics
 */
export interface CommentMetrics {
  commentCount30d: number | null;
  commentCountAllTime: number | null;
}

/**
 * Copy trading metrics
 */
export interface CopytradedMetrics {
  count: number | null;
  distinctActors: number | null;
  volumeUSD: number | null;
}

/**
 * Social metrics for a profile
 */
export interface ProfileMetrics {
  thisPartner: PartnerMetrics;
  allPartners: PartnerMetrics;
  comments: CommentMetrics;
  copytradedAllTime: CopytradedMetrics;
}

/**
 * A trader entry in the leaderboard
 */
export interface LeaderboardTrader {
  reason: LeaderboardReason;
  id: string;
  name: string;
  images: ProfileImages;
  addresses: string[];
  metadata: ProfileMetadata;
  metrics?: ProfileMetrics;
}

/**
 * A section of the leaderboard (e.g., by chain, by community)
 */
export interface LeaderboardSection {
  key: string;
  title: string;
  description: string;
  commenters: LeaderboardTrader[];
  others: LeaderboardTrader[];
}

/**
 * Response from the Clicker Leaderboard API
 */
export interface LeaderboardResponse {
  sections: LeaderboardSection[];
}

/**
 * Parameters for the leaderboard API request
 */
export interface LeaderboardParams {
  /** Number of results to return (1-250, default 50) */
  limit?: number;
  /** Specific sections to fetch */
  sections?: string | string[];
}

/**
 * State for the leaderboard data
 */
export interface LeaderboardState {
  traders: LeaderboardTrader[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

/**
 * Full trader profile from the Profile API
 * @see https://docs.clicker.xyz/api-reference/profile
 */
export interface TraderProfile {
  id: string;
  name: string;
  images: ProfileImages;
  addresses: string[];
  metadata: ProfileMetadata;
  metrics?: ProfileMetrics;
}
