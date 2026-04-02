import { useMemo, useCallback, useState, useEffect } from 'react';
import { useQuery } from '@metamask/react-data-query';
// TODO: Update import to @metamask/social-controllers once the package is released.
import type {
  LeaderboardResponse,
  FetchLeaderboardOptions,
} from '@metamask-previews/social-controllers';
import Logger from '../../../../../../util/Logger';
import type { TopTrader } from '../types';

/**
 * Result interface for the useTopTraders hook.
 */
export interface UseTopTradersResult {
  traders: TopTrader[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleFollow: (traderId: string) => void;
}

interface UseTopTradersOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook that provides top traders data for the social leaderboard.
 *
 * Uses the Data Services Pattern -- `useQuery` from `@metamask/react-data-query`
 * resolves the `SocialService:fetchLeaderboard` query key through the messenger
 * adapter, so the SocialService handles caching, de-duplication, and retries.
 *
 * @param options - Optional configuration.
 * @param options.limit - Maximum number of traders to return.
 * @returns Object with traders, isLoading, error, refresh, toggleFollow
 */
export const useTopTraders = (
  options?: UseTopTradersOptions,
): UseTopTradersResult => {
  const fetchOptions: FetchLeaderboardOptions | null = options?.limit
    ? { limit: options.limit }
    : null;

  const queryKey: [string, FetchLeaderboardOptions | null] = [
    'SocialService:fetchLeaderboard',
    fetchOptions,
  ];

  const { data, isLoading, error, refetch } = useQuery<LeaderboardResponse>({
    queryKey,
    enabled: options?.enabled ?? true,
  });

  const [localFollowOverrides, setLocalFollowOverrides] = useState<
    Record<string, boolean>
  >({});

  const traders: TopTrader[] = useMemo(() => {
    if (!data?.traders) {
      return [];
    }

    return data.traders.map((entry) => ({
      id: entry.profileId,
      rank: entry.rank,
      username: entry.name,
      avatarUri: entry.imageUrl ?? undefined,
      percentageChange: (entry.roiPercent30d ?? 0) * 100,
      pnlValue: entry.pnl30d,
      isFollowing: localFollowOverrides[entry.profileId] ?? false,
    }));
  }, [data, localFollowOverrides]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      Logger.error(err as Error, 'useTopTraders: refresh failed');
      throw err;
    }
  }, [refetch]);

  const toggleFollow = useCallback((traderId: string) => {
    setLocalFollowOverrides((prev) => ({
      ...prev,
      [traderId]: !prev[traderId],
    }));
  }, []);

  useEffect(() => {
    if (error) {
      Logger.error(error as Error, 'useTopTraders: leaderboard fetch failed');
    }
  }, [error]);

  return {
    traders,
    isLoading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    refresh,
    toggleFollow,
  };
};

export default useTopTraders;
