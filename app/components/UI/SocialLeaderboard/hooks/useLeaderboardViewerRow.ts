import { useMemo } from 'react';
import type { TopTrader } from '../../../Views/Homepage/Sections/TopTraders/types';
import { useMyProfile } from '../../../Views/SocialLeaderboard/MyProfileView/hooks';
import { getTraderMetricDisplay } from '../../../Views/SocialLeaderboard/TopTradersView/traderMetric';
import type { LeaderboardSort } from '../../../Views/SocialLeaderboard/components/Filters';
import type { RankedTrader } from '../types';

export interface LeaderboardViewerRow {
  trader: RankedTrader;
  /** The viewer is not on the loaded page, so their position is unknown. */
  hideRank: boolean;
}

export interface UseLeaderboardViewerRowResult {
  viewerRow: LeaderboardViewerRow | null;
  /** Ranked rows without the viewer, who is pinned above them instead. */
  rowsWithoutViewer: RankedTrader[];
  viewerProfileId?: string;
  viewerAddress?: string;
}

/**
 * Pins the signed-in viewer above the ranking. When they are on the loaded
 * page their real row moves up; otherwise a rank-less card is built from
 * their own profile.
 */
export const useLeaderboardViewerRow = (
  traders: RankedTrader[],
  sort: LeaderboardSort,
  enabled: boolean,
): UseLeaderboardViewerRowResult => {
  const { profile } = useMyProfile();

  const matchedViewer = useMemo(() => {
    if (!enabled || !profile) {
      return undefined;
    }
    const linked = profile.linkedAccountAddress?.toLowerCase();
    return traders.find(
      (trader) =>
        trader.id === profile.profileId ||
        Boolean(linked && trader.address.toLowerCase() === linked),
    );
  }, [enabled, profile, traders]);

  const rowsWithoutViewer = useMemo(
    () =>
      matchedViewer
        ? traders.filter((trader) => trader.id !== matchedViewer.id)
        : traders,
    [matchedViewer, traders],
  );

  const viewerRow = useMemo((): LeaderboardViewerRow | null => {
    if (!enabled || !profile) {
      return null;
    }
    if (matchedViewer) {
      return { trader: matchedViewer, hideRank: false };
    }
    const synthetic: TopTrader = {
      id: profile.profileId,
      address: profile.linkedAccountAddress ?? '',
      rank: 0,
      overallRank: 0,
      username: profile.handle || profile.displayName,
      avatarUri: profile.imageUrl ?? undefined,
      percentageChange: 0,
      pnlValue: profile.pnlUsd ?? 0,
      winRatePercent: profile.winRatePercent ?? null,
      pnlPerChain: {},
      followerCount: profile.followerCount ?? 0,
      isFollowing: false,
    };
    return {
      trader: {
        ...synthetic,
        displayMetric: getTraderMetricDisplay(synthetic, sort),
      },
      hideRank: true,
    };
  }, [enabled, matchedViewer, profile, sort]);

  return {
    viewerRow,
    rowsWithoutViewer,
    viewerProfileId: profile?.profileId ?? undefined,
    viewerAddress: profile?.linkedAccountAddress ?? undefined,
  };
};
