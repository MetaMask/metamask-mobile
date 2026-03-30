/**
 * Represents a single top trader in the social leaderboard.
 */
export interface TopTrader {
  /** Unique identifier for the trader */
  id: string;
  /** Rank position in the leaderboard (1-based) */
  rank: number;
  /** Display username */
  username: string;
  /** Optional URI for the trader's profile avatar image */
  avatarUri?: string;
  /** Percentage change over the period (e.g. 50.2 for +50.2%) */
  percentageChange: number;
  /** Formatted profit amount string (e.g. "+$45,900K") */
  profitAmount: string;
  /** Time period label (e.g. "30D") */
  period: string;
  /** Whether the current user is following this trader */
  isFollowing: boolean;
}

/**
 * Network filter selection for the leaderboard.
 * null means "All networks".
 */
export type NetworkFilterSelection = string | null;
