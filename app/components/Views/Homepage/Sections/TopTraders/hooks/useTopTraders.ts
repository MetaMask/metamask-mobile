import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  LeaderboardResponse,
  FetchLeaderboardOptions,
} from '@metamask/social-controllers';
import {
  useFollowToggleMany,
  type FollowToggleAnalyticsContext,
} from '../../../../../hooks/useFollowToggle';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import type { TopTrader } from '../types';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../../util/social/socialServiceTelemetry';

export interface UseTopTradersResult {
  traders: TopTrader[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleFollow: (
    addressOrId: string,
    analyticsContext?: FollowToggleAnalyticsContext,
  ) => Promise<void>;
}

interface UseTopTradersOptions {
  limit?: number;
  chains?: string[];
  /** Ranking metric forwarded to the API. Defaults to the server's own order. */
  sort?: FetchLeaderboardOptions['sort'];
  /**
   * Which trailing window the reported PnL and ROI come from. The API returns
   * both windows in one response, so switching this remaps the loaded entries
   * without refetching.
   */
  timeframe?: '7d' | '30d';
  enabled?: boolean;
}

export const useTopTraders = (
  options?: UseTopTradersOptions,
): UseTopTradersResult => {
  const isUnlocked = useSelector(selectIsUnlocked);

  const hasLimit = options?.limit !== undefined;
  const hasChains = options?.chains !== undefined;
  const hasSort = options?.sort !== undefined;
  const timeframe = options?.timeframe ?? '7d';
  const fetchOptions: FetchLeaderboardOptions | null =
    hasLimit || hasChains || hasSort
      ? {
          ...(hasLimit && { limit: options?.limit }),
          ...(hasChains && { chains: options?.chains }),
          ...(hasSort && { sort: options?.sort }),
        }
      : null;

  const queryKey: [string, FetchLeaderboardOptions | null] = [
    'SocialService:fetchLeaderboard',
    fetchOptions,
  ];

  // Pause while locked so queryFn never reaches SocialService.#getAuthHeaders →
  // AuthenticationController.getBearerToken (throws "wallet is locked").
  // Also disable automatic focus/reconnect refetches: ReactQueryService wires
  // AppState → focusManager, and react-data-query uses staleTime: 0, so a
  // foreground/reconnect can otherwise run queryFn before React commits
  // enabled:false after background auto-lock. Unlock flips enabled true and fetches.
  const { data, isLoading, isFetching, error, refetch } =
    useQuery<LeaderboardResponse>({
      queryKey,
      enabled: (options?.enabled ?? true) && isUnlocked,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  const leaderboardQueryParams = useMemo(
    () => ({
      limit: options?.limit ?? 0,
      ...(hasChains && { chains: (options?.chains ?? []).join(',') }),
      ...(hasSort && { sort: options?.sort }),
    }),
    [options?.limit, options?.chains, options?.sort, hasChains, hasSort],
  );

  useLogSocialQueryError(error, {
    surface: 'top_traders',
    operation: 'fetch_leaderboard',
    extraMessage: 'Top traders leaderboard fetch failed',
    source: 'useTopTraders',
    endpoint: 'leaderboard',
    queryParams: leaderboardQueryParams,
  });

  const { isFollowing, toggleFollow } = useFollowToggleMany();

  const traders: TopTrader[] = useMemo(() => {
    if (!data?.traders) {
      return [];
    }

    const is30d = timeframe === '30d';
    const toWholePercent = (fraction: number | null | undefined) =>
      fraction == null ? null : fraction * 100;

    return data.traders.map((entry) => ({
      id: entry.profileId,
      address: entry.addresses?.[0] ?? '',
      rank: entry.rank,
      overallRank: entry.rank,
      username: entry.name,
      avatarUri: entry.imageUrl ?? undefined,
      // `roiPercent*` is already a whole-percent value from the API
      // (e.g. 20.98 → "20.98%"); do not multiply by 100.
      percentageChange: (is30d ? entry.roiPercent30d : entry.roiPercent7d) ?? 0,
      pnlValue: (is30d ? entry.pnl30d : entry.pnl7d) ?? 0,
      winRatePercent: toWholePercent(
        is30d ? entry.winRate30d : entry.winRate7d,
      ),
      pnlPerChain: entry.pnlPerChain ?? {},
      isFollowing: isFollowing(entry.profileId),
    }));
  }, [data, isFollowing, timeframe]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      reportSocialServiceFailure(
        err,
        {
          surface: 'top_traders',
          operation: 'refresh',
          extraMessage: 'Top traders leaderboard refresh failed',
          source: 'useTopTraders',
          endpoint: 'leaderboard',
          queryParams: leaderboardQueryParams,
        },
        { breadcrumb: false },
      );
      throw err;
    }
  }, [refetch, leaderboardQueryParams]);

  return {
    traders,
    isLoading,
    isFetching,
    error: formatSocialQueryErrorMessage(error),
    refresh,
    toggleFollow,
  };
};

export default useTopTraders;
