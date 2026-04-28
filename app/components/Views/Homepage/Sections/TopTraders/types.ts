/**
 * Represents a single top trader in the social leaderboard.
 *
 * Mapped from `LeaderboardEntry` returned by SocialService.
 */
export interface TopTrader {
  /** Clicker profile ID. */
  id: string;
  /** Primary wallet address. Used for analytics keys. */
  address: string;
  /** Rank position in the leaderboard (1-based). */
  rank: number;
  /**
   * Overall rank across all chains (1-based). Preserved through chain
   * filtering so podium decorations (gold/silver/bronze treatments) only
   * apply to true top-3 traders rather than the top of an arbitrary filter.
   */
  overallRank: number;
  /** Display username or truncated address. */
  username: string;
  /** Profile avatar URL. */
  avatarUri?: string;
  /** ROI percentage over 30 days (e.g. 96.2 for +96.2%). */
  percentageChange: number;
  /** Absolute PnL over 30 days in USD (raw number, formatted by the UI). */
  pnlValue: number;
  /** PnL broken down by chain. Used for client-side chain filtering. */
  pnlPerChain: Record<string, number>;
  /** Whether the current user is following this trader. */
  isFollowing: boolean;
}

/**
 * Network filter selection for the leaderboard.
 * null means "All networks".
 */
export type NetworkFilterSelection = string | null;
