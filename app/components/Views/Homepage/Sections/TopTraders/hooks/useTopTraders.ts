import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@metamask/react-data-query';
// TODO: Update import to @metamask/social-controllers once the package is released.
import type {
  LeaderboardResponse,
  FetchLeaderboardOptions,
} from '@metamask-previews/social-controllers';
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
    enabled: true,
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
      percentageChange: (entry.roi30d ?? 0) * 100,
      pnlValue: entry.pnl30d,
      isFollowing: localFollowOverrides[entry.profileId] ?? false,
    }));
  }, [data, localFollowOverrides]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const toggleFollow = useCallback((traderId: string) => {
    setLocalFollowOverrides((prev) => ({
      ...prev,
      [traderId]: !prev[traderId],
    }));
  }, []);

  return {
    traders,
    isLoading,
    error: error ? String(error) : null,
    refresh,
    toggleFollow,
  };
};

export default useTopTraders;
