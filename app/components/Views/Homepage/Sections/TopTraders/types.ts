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
  /** Followers this trader has, as reported by the leaderboard. */
  followerCount: number;
  /** Whether the current user is following this trader. */
  isFollowing: boolean;
}

/**
 * The figure shown under the username on a trader row. Callers that rank by
 * something other than PnL (e.g. the leaderboard's Sort by control) pass the
 * ranked value here so the row shows what the list is ordered by.
 *
 * Lives here rather than beside a single row component because every trader
 * row variant renders it and `traderMetric.ts` builds it.
 */
export interface TraderRowMetric {
  /** Pre-formatted value, e.g. `+$45,900.89`, `+43.00%` or `92%`. */
  label: string;
  /** Renders the value in success green rather than error red. */
  isPositive: boolean;
}

/**
 * Props shared by every trader row variant, so a list can accept one as an
 * injected `RowComponent` without knowing which variant it received.
 */
export interface TraderRowProps {
  trader: TopTrader;
  /** Defaults to the trader's PnL for the loaded window. */
  metric?: TraderRowMetric;
  onFollowPress: (traderId: string) => void;
  onTraderPress?: (
    traderId: string,
    traderName: string,
    /* Used downstream for podium decoration */
    overallRank: number,
  ) => void;
  /** Whether this trader's alerts are paused. Only used when muting is shown. */
  isMuted?: boolean;
  /**
   * When true (and the trader is followed), render the inline mute chip beside
   * the Follow button. Gated by the caller on push-notification availability.
   */
  showMute?: boolean;
  /** Toggles the muted state for this trader. */
  onMuteToggle?: (traderId: string) => void;
  testID?: string;
}

/**
 * Network filter selection for the leaderboard.
 * null means "All networks".
 */
export type NetworkFilterSelection = string | null;
