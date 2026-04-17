import { useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  LeaderboardResponse,
  FetchLeaderboardOptions,
} from '@metamask/social-controllers';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { selectFollowingProfileIds } from '../../../../../../selectors/socialController';
import type { TopTrader } from '../types';

export interface UseTopTradersResult {
  traders: TopTrader[];
  isLoading: boolean;
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

  const followingProfileIds = useSelector(selectFollowingProfileIds);

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
      pnlPerChain: entry.pnlPerChain ?? {},
      isFollowing: followingProfileIds.includes(entry.profileId),
    }));
  }, [data, followingProfileIds]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      Logger.error(err as Error, 'useTopTraders: refresh failed');
      throw err;
    }
  }, [refetch]);

  const toggleFollow = useCallback(
    async (addressOrId: string) => {
      try {
        const { profileId } =
          await Engine.context.AuthenticationController.getSessionProfile();
        const isCurrentlyFollowing = followingProfileIds.includes(addressOrId);
        const opts = { addressOrUid: profileId, targets: [addressOrId] };
        if (isCurrentlyFollowing) {
          await (Engine.controllerMessenger.call as CallableFunction)(
            'SocialController:unfollowTrader',
            opts,
          );
        } else {
          await (Engine.controllerMessenger.call as CallableFunction)(
            'SocialController:followTrader',
            opts,
          );
        }
      } catch (err) {
        Logger.error(err as Error, 'useTopTraders: toggleFollow failed');
      }
    },
    [followingProfileIds],
  );

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
