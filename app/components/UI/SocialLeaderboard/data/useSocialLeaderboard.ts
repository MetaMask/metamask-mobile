import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectSocialLeaderboardEnabled,
  selectSocialLeaderboardPerpsEnabled,
} from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  useTopTraders,
  type UseTopTradersResult,
} from '../../../Views/Homepage/Sections/TopTraders/hooks';
import {
  getTraderMetricDisplay,
  rankTradersByMetric,
} from '../../../Views/SocialLeaderboard/TopTradersView/traderMetric';
import type { LeaderboardSort } from '../../../Views/SocialLeaderboard/components/Filters';
import {
  resolveSocialLeaderboardSource,
  type SocialLeaderboardResolution,
  type SocialLeaderboardSource,
} from './socialLeaderboardSource';
import type { RankedTrader, SocialLeaderboardFilters } from '../types';

/**
 * Rows fetched per ranking. Fixed rather than taken from the host's `limit`,
 * so a 5-row preview and the full tab share one cached response.
 */
export const LEADERBOARD_FETCH_LIMIT = 50;

export interface UseSocialLeaderboardOptions {
  timeframe: SocialLeaderboardFilters['timeframe'];
  sort: LeaderboardSort;
  /** Gate the query. Always additionally gated on the feature flag and unlock. */
  enabled?: boolean;
}

export interface SocialLeaderboardState
  extends Pick<
    UseTopTradersResult,
    'isLoading' | 'isFetching' | 'hasFetched' | 'error' | 'refresh'
  > {
  /** Ranked by `sort` in the selected window, with the row metric attached. */
  traders: RankedTrader[];
  toggleFollow: UseTopTradersResult['toggleFollow'];
  resolution: SocialLeaderboardResolution;
}

/**
 * Leaderboard for any {@link SocialLeaderboardSource}. Owns the request
 * mapping, the perps flag, and re-ranking the loaded page by the selected
 * metric and window (the API always ranks on its own 30-day figures).
 */
export const useSocialLeaderboard = (
  source: SocialLeaderboardSource | null,
  { timeframe, sort, enabled = true }: UseSocialLeaderboardOptions,
): SocialLeaderboardState => {
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);

  const resolution = useMemo(
    (): SocialLeaderboardResolution =>
      source
        ? resolveSocialLeaderboardSource(source, { isPerpsEnabled })
        : { status: 'hidden' },
    [isPerpsEnabled, source],
  );
  const isReady = resolution.status === 'ready';

  const result = useTopTraders({
    limit: LEADERBOARD_FETCH_LIMIT,
    chains: resolution.status === 'ready' ? resolution.chains : undefined,
    sort,
    timeframe,
    enabled: isEnabled && enabled && isReady,
  });

  const { traders: loadedTraders, refresh: refetch } = result;
  const traders = useMemo<RankedTrader[]>(
    () =>
      isReady
        ? rankTradersByMetric(loadedTraders, sort).map((trader) => ({
            ...trader,
            displayMetric: getTraderMetricDisplay(trader, sort),
          }))
        : [],
    [isReady, loadedTraders, sort],
  );

  // `refetch` ignores `enabled`, so a source with no request must not reach it.
  const refresh = useCallback(
    () => (isReady ? refetch() : Promise.resolve()),
    [isReady, refetch],
  );

  return {
    traders,
    isLoading: isReady && result.isLoading,
    isFetching: isReady && result.isFetching,
    hasFetched: isReady && result.hasFetched,
    error: isReady ? result.error : null,
    refresh,
    toggleFollow: result.toggleFollow,
    resolution,
  };
};
