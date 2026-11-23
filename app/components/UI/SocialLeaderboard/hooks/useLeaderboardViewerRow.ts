import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { TraderProfileResponse } from '@metamask/social-controllers';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
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
  /** ROI is absent, so the percent line stays hidden on the pinned card. */
  omitPercentage: boolean;
}

export interface UseLeaderboardViewerRowResult {
  viewerRow: LeaderboardViewerRow | null;
  /** Ranked rows without the viewer, who is pinned above them instead. */
  rowsWithoutViewer: RankedTrader[];
  viewerProfileId?: string;
  viewerAddress?: string;
  /** Refetches the off-page profile. No-op when that request is not active. */
  refreshViewerProfile: () => Promise<void>;
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
  const isUnlocked = useSelector(selectIsUnlocked);

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

  // Pause while locked so the query never reaches getBearerToken. Focus and
  // reconnect refetches stay off: React Query can run them on foreground
  // before React commits enabled:false after auto-lock. Unlock enables the
  // query and fetches.
  const shouldFetchProfile = Boolean(
    enabled && isUnlocked && profile && !matchedViewer,
  );
  const {
    data: liveProfile,
    error: liveProfileError,
    refetch: refetchViewerProfile,
  } = useQuery<TraderProfileResponse>({
    queryKey: buildTraderProfileQueryKey(profile?.profileId ?? ''),
    enabled: shouldFetchProfile,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const refreshViewerProfile = useCallback(async () => {
    if (!shouldFetchProfile) {
      return;
    }
    await refetchViewerProfile();
  }, [refetchViewerProfile, shouldFetchProfile]);

  const viewerRow = useMemo((): LeaderboardViewerRow | null => {
    if (!enabled || !profile) {
      return null;
    }
    if (matchedViewer) {
      return {
        trader: matchedViewer,
        hideRank: false,
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
    refreshViewerProfile,
  };
};
