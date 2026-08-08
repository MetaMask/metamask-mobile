/**
 * Sort criteria for trader profile position lists.
 *
 * Defined here (in the store layer) rather than in the view so the reducer
 * never imports from app/components/Views (ADR-0020 route-isolation). The
 * view's sortPositions util re-exports these for its own use.
 */
export type PositionSortKey = 'value' | 'pnl' | 'recent';
export type OpenSortKey = PositionSortKey;
export type ClosedSortKey = PositionSortKey;
export type SortKey = OpenSortKey | ClosedSortKey;

/**
 * Persisted UI state for the Social Leaderboard feature.
 */
export interface SocialLeaderboardState {
  /**
   * The active sort selection for each trader profile position tab. Kept in
   * Redux (and persisted by default) so the choice survives leaving/returning
   * to a profile and app restarts.
   */
  positionSort: {
    open: OpenSortKey;
    closed: ClosedSortKey;
  };
}
