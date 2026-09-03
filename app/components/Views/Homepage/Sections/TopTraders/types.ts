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
  /** ROI percentage over the requested window (e.g. 96.2 for +96.2%). */
  percentageChange: number;
  /** Absolute PnL over the requested window in USD (formatted by the UI). */
  pnlValue: number;
  /**
   * Share of winning trades over the requested window, as a whole percent
   * (e.g. 92 for 92%) to match `percentageChange`. The API reports it as a
   * 0–1 fraction. `null` when the window has no win-rate data.
   */
  winRatePercent: number | null;
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
