import { useMemo } from 'react';

/** Historical full-board depth for campaigns that do not pass `boardSize`. */
const DEFAULT_BOARD_SIZE = 20;
const SPLIT_VIEW_TOP_COUNT_PREVIEW = 3;
/**
 * Ranks immediately past the board whose neighbor window overlaps the tail.
 * The top strip drops two rows so those neighbors are not drawn twice.
 */
const SPLIT_VIEW_OVERLAP_RANK_OFFSETS = [1, 2] as const;

export interface CampaignLeaderboardUserPosition<TEntry> {
  rank: number;
  neighbors: TEntry[];
}

interface UseCampaignLeaderboardEntriesParams<
  TEntry,
  TUserPosition extends CampaignLeaderboardUserPosition<TEntry>,
> {
  entries: TEntry[];
  maxEntries?: number;
  userPosition?: TUserPosition | null;
  canShowSplitView?: boolean;
  /**
   * Full-leaderboard depth. A smaller `maxEntries` still previews that many
   * rows. Defaults to 20 so campaigns that do not pass it keep the historical
   * cap. Perps passes the returned row count, floored at 20.
   */
  boardSize?: number;
}

export const useCampaignLeaderboardEntries = <
  TEntry,
  TUserPosition extends CampaignLeaderboardUserPosition<TEntry>,
>({
  entries,
  maxEntries,
  userPosition,
  canShowSplitView = true,
  boardSize,
}: UseCampaignLeaderboardEntriesParams<TEntry, TUserPosition>) => {
  const isPreview = maxEntries != null;
  const resolvedBoardSize =
    typeof boardSize === 'number' &&
    Number.isFinite(boardSize) &&
    boardSize >= 1
      ? boardSize
      : DEFAULT_BOARD_SIZE;

  const effectiveMaxEntries =
    maxEntries != null && maxEntries <= resolvedBoardSize
      ? maxEntries
      : resolvedBoardSize;

  const splitViewTopCount = useMemo(() => {
    if (isPreview) {
      return SPLIT_VIEW_TOP_COUNT_PREVIEW;
    }
    const rank = userPosition?.rank;
    if (rank == null) {
      return resolvedBoardSize;
    }
    const overlapsBoardTail = SPLIT_VIEW_OVERLAP_RANK_OFFSETS.some(
      (offset) => rank === resolvedBoardSize + offset,
    );
    return overlapsBoardTail
      ? Math.max(resolvedBoardSize - 2, 0)
      : resolvedBoardSize;
  }, [isPreview, resolvedBoardSize, userPosition?.rank]);

  const showSplitView = useMemo(() => {
    if (!userPosition || !canShowSplitView) return false;
    return (
      userPosition.rank > effectiveMaxEntries &&
      userPosition.neighbors.length > 0
    );
  }, [canShowSplitView, effectiveMaxEntries, userPosition]);

  const visibleEntries = useMemo(() => {
    if (showSplitView) {
      return entries.slice(0, splitViewTopCount);
    }
    return entries.slice(0, effectiveMaxEntries);
  }, [entries, effectiveMaxEntries, showSplitView, splitViewTopCount]);

  return {
    effectiveMaxEntries,
    isPreview,
    showSplitView,
    splitViewTopCount,
    visibleEntries,
  };
};
