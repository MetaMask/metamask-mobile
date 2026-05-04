import { useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  LeaderboardResponse,
  FetchLeaderboardOptions,
} from '@metamask/social-controllers';
import Logger from '../../../../../../util/Logger';
import { useFollowToggleMany } from '../../../../../hooks/useFollowToggle';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import type { TopTrader } from '../types';
import {
  addSocialBreadcrumb,
  buildSocialErrorExtras,
  categoriseSocialError,
  extractHttpStatus,
} from '../../../../../../util/social/socialServiceTelemetry';

export interface UseTopTradersResult {
  traders: TopTrader[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleFollow: (addressOrId: string) => void;
}

interface UseTopTradersOptions {
  limit?: number;
  enabled?: boolean;
}

export const useTopTraders = (
  options?: UseTopTradersOptions,
): UseTopTradersResult => {
  const isUnlocked = useSelector(selectIsUnlocked);

  const fetchOptions: FetchLeaderboardOptions | null = options?.limit
    ? { limit: options.limit }
    : null;

  const queryKey: [string, FetchLeaderboardOptions | null] = [
    'SocialService:fetchLeaderboard',
    fetchOptions,
  ];

  const { data, isLoading, isFetching, error, refetch } =
    useQuery<LeaderboardResponse>({
      queryKey,
      enabled: (options?.enabled ?? true) && isUnlocked,
    });

  const { isFollowing, toggleFollow } = useFollowToggleMany();

  const traders: TopTrader[] = useMemo(() => {
    if (!data?.traders) {
      return [];
    }

    return data.traders.map((entry) => ({
      id: entry.profileId,
      rank: entry.rank,
      overallRank: entry.rank,
      username: entry.name,
      avatarUri: entry.imageUrl ?? undefined,
      percentageChange: (entry.roiPercent30d ?? 0) * 100,
      pnlValue: entry.pnl30d,
      pnlPerChain: entry.pnlPerChain ?? {},
      isFollowing: isFollowing(entry.profileId),
    }));
  }, [data, isFollowing]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      Logger.error(
        err as Error,
        buildSocialErrorExtras({
          legacyMessage: 'useTopTraders: refresh failed',
          endpoint: 'leaderboard',
          error: err,
          queryParams: { limit: options?.limit ?? 0 },
        }),
      );
      throw err;
    }
  }, [refetch, options?.limit]);

  useEffect(() => {
    if (error) {
      Logger.error(
        error as Error,
        buildSocialErrorExtras({
          legacyMessage: 'useTopTraders: leaderboard fetch failed',
          endpoint: 'leaderboard',
          error,
          queryParams: { limit: options?.limit ?? 0 },
        }),
      );
      addSocialBreadcrumb({
        endpoint: 'leaderboard',
        errorCategory: categoriseSocialError(error),
        httpStatus: extractHttpStatus(error),
        queryParams: { limit: options?.limit ?? 0 },
      });
    }
  }, [error, options?.limit]);

  return {
    traders,
    isLoading,
    isFetching,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    refresh,
    toggleFollow,
  };
};

export default useTopTraders;
