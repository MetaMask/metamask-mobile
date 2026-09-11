/**
 * Position-type filter shared by the leaderboard (`TopTradersView`) and the
 * activity feed (`FeedView`): everything, spot tokens, or perps.
 */
export type SocialTypeFilter = 'all' | 'tokens' | 'perps';

/**
 * Trailing window the leaderboard and feed are scoped to. Matches the two
 * windows the social API reports per trader (`*7d` / `*30d`).
 */
export type SocialTimeframe = '7d' | '30d';

/**
 * Leaderboard ranking metric. Values are the `sort` query the social API
 * accepts, so they can be forwarded to `SocialService:fetchLeaderboard`
 * verbatim.
 */
export type LeaderboardSort = 'pnl' | 'roi' | 'winRate';
