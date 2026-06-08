import { useMemo } from 'react';

const MAX_ENTRIES_LIMIT = 20;
const SPLIT_VIEW_TOP_COUNT_PREVIEW = 3;
const FULL_SPLIT_TOP_REDUCED_AT_RANKS: readonly number[] = [21, 22];

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
}

export const useCampaignLeaderboardEntries = <
  TEntry,
  TUserPosition extends CampaignLeaderboardUserPosition<TEntry>,
>({
  entries,
  maxEntries,
  userPosition,
  canShowSplitView = true,
}: UseCampaignLeaderboardEntriesParams<TEntry, TUserPosition>) => {
  const isPreview = maxEntries != null;

  const effectiveMaxEntries =
    maxEntries != null && maxEntries <= MAX_ENTRIES_LIMIT
      ? maxEntries
      : MAX_ENTRIES_LIMIT;

  const splitViewTopCount = useMemo(() => {
    if (isPreview) {
      return SPLIT_VIEW_TOP_COUNT_PREVIEW;
    }
    const rank = userPosition?.rank;
    if (rank == null) {
      return MAX_ENTRIES_LIMIT;
    }
    return FULL_SPLIT_TOP_REDUCED_AT_RANKS.includes(rank)
      ? MAX_ENTRIES_LIMIT - 2
      : MAX_ENTRIES_LIMIT;
  }, [isPreview, userPosition?.rank]);

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
