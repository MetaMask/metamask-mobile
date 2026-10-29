import { useMemo } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type { TraderProfileResponse } from '@metamask/social-controllers';
import { buildTraderProfileQueryKey } from '../../../../util/social/traderProfileQueries';
import type {
  LeaderboardSort,
  SocialTimeframe,
} from '../../../Views/SocialLeaderboard/components/Filters';
import { useMyProfile } from '../../../Views/SocialLeaderboard/MyProfileView/hooks';
import type { RankedTrader } from '../types';
import { buildOffPageViewerTrader } from './buildOffPageViewerTrader';

export interface LeaderboardViewerScope {
  timeframe: SocialTimeframe;
  chains: readonly string[];
}

export interface LeaderboardViewerRow {
  trader: RankedTrader;
  /** The viewer is not on the loaded page, so their position is unknown. */
  hideRank: boolean;
  /** No PnL for the selected window. The card shows an empty state. */
  empty: boolean;
  /** ROI is absent, so the percent line stays hidden on the pinned card. */
  omitPercentage: boolean;
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
 * page their real row moves up. Otherwise their trader profile fills the
 * card. That profile request stays off until the viewer is missing from the
 * page, and the card stays hidden until it resolves so a miss never flashes
 * as $0.
 */
export const useLeaderboardViewerRow = (
  traders: RankedTrader[],
  sort: LeaderboardSort,
  enabled: boolean,
  scope: LeaderboardViewerScope,
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

  const shouldFetchProfile = Boolean(enabled && profile && !matchedViewer);
  const { data: liveProfile, error: liveProfileError } =
    useQuery<TraderProfileResponse>({
      queryKey: buildTraderProfileQueryKey(profile?.profileId ?? ''),
      enabled: shouldFetchProfile,
    });

  const viewerRow = useMemo((): LeaderboardViewerRow | null => {
    if (!enabled || !profile) {
      return null;
    }
    if (matchedViewer) {
      return {
        trader: matchedViewer,
        hideRank: false,
        empty: false,
        omitPercentage: false,
      };
    }
    // A failed or in-flight profile must not become a $0 card.
    if (liveProfileError || !liveProfile) {
      return null;
    }
    const offPage = buildOffPageViewerTrader({
      identity: profile,
      live: liveProfile,
      sort,
      timeframe: scope.timeframe,
      chains: scope.chains,
    });
    return {
      trader: offPage.trader,
      hideRank: true,
      empty: offPage.empty,
      omitPercentage: offPage.omitPercentage,
    };
  }, [
    enabled,
    liveProfile,
    liveProfileError,
    matchedViewer,
    profile,
    scope.chains,
    scope.timeframe,
    sort,
  ]);

  return {
    viewerRow,
    rowsWithoutViewer,
    viewerProfileId: profile?.profileId ?? undefined,
    viewerAddress: profile?.linkedAccountAddress ?? undefined,
  };
};
