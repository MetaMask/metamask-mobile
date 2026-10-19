import { useMemo } from 'react';
import {
  DEFAULT_LEADERBOARD_SORT,
  DEFAULT_TIMEFRAME,
  SPOT_CHAINS,
} from '../../../../shared/top-traders-constants';
import { rankTradersByMetric } from '../../../TopTradersView/traderMetric';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import {
  useTopTraders,
  type UseTopTradersResult,
} from '../../../../Homepage/Sections/TopTraders/hooks';
/* eslint-enable import-x/no-restricted-paths */

export const POPULAR_TRADERS_DISPLAY_COUNT = 10;
export const POPULAR_TRADERS_FETCH_LIMIT = 50;

export type UsePopularTradersResult = UseTopTradersResult;

/**
 * Leaderboard top 10 for Social V1 discovery (Trending carousel and
 * Profiles to follow). Same ranking as the homepage Top traders rail:
 * fetch 50 spot-chain rows, re-rank by 7d PnL, then slice 10.
 */
export const usePopularTraders = (enabled = true): UsePopularTradersResult => {
  const { traders: allTraders, ...rest } = useTopTraders({
    limit: POPULAR_TRADERS_FETCH_LIMIT,
    chains: SPOT_CHAINS,
    sort: DEFAULT_LEADERBOARD_SORT,
    timeframe: DEFAULT_TIMEFRAME,
    enabled,
  });

  const traders = useMemo(
    () =>
      rankTradersByMetric(allTraders, DEFAULT_LEADERBOARD_SORT).slice(
        0,
        POPULAR_TRADERS_DISPLAY_COUNT,
      ),
    [allTraders],
  );

  return { traders, ...rest };
};
