import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
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

  // Optimistic follow overrides per trader id: `true` = optimistically
  // following, `false` = optimistically unfollowing, absent = defer to Redux.
  const [optimisticFollowState, setOptimisticFollowState] = useState<
    Record<string, boolean>
  >({});
  const inflightIdsRef = useRef<Set<string>>(new Set());

  const traders: TopTrader[] = useMemo(() => {
    if (!data?.traders) {
      return [];
    }

    return data.traders.map((entry) => {
      const currentFollowing = followingProfileIds.includes(entry.profileId);
      const optimistic = optimisticFollowState[entry.profileId];
      return {
        id: entry.profileId,
        rank: entry.rank,
        username: entry.name,
        avatarUri: entry.imageUrl ?? undefined,
        percentageChange: (entry.roiPercent30d ?? 0) * 100,
        pnlValue: entry.pnl30d,
        pnlPerChain: entry.pnlPerChain ?? {},
        isFollowing: optimistic ?? currentFollowing,
      };
    });
  }, [data, followingProfileIds, optimisticFollowState]);

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
      if (inflightIdsRef.current.has(addressOrId)) {
        return;
      }
      inflightIdsRef.current.add(addressOrId);

      const currentOptimistic = optimisticFollowState[addressOrId];
      const currentlyFollowing =
        currentOptimistic ?? followingProfileIds.includes(addressOrId);
      const nextValue = !currentlyFollowing;

      setOptimisticFollowState((prev) => ({
        ...prev,
        [addressOrId]: nextValue,
      }));

      try {
        const { profileId } =
          await Engine.context.AuthenticationController.getSessionProfile();
        const opts = { addressOrUid: profileId, targets: [addressOrId] };
        if (nextValue) {
          await (Engine.controllerMessenger.call as CallableFunction)(
            'SocialController:followTrader',
            opts,
          );
        } else {
          await (Engine.controllerMessenger.call as CallableFunction)(
            'SocialController:unfollowTrader',
            opts,
          );
        }
      } catch (err) {
        setOptimisticFollowState((prev) => {
          const next = { ...prev };
          delete next[addressOrId];
          return next;
        });
        Logger.error(err as Error, 'useTopTraders: toggleFollow failed');
      } finally {
        inflightIdsRef.current.delete(addressOrId);
      }
    },
    [followingProfileIds, optimisticFollowState],
  );

  // Clear optimistic overrides once Redux has caught up with the intended
  // value, to avoid stale entries lingering in local state.
  useEffect(() => {
    setOptimisticFollowState((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [id, value] of Object.entries(prev)) {
        const currentFollowing = followingProfileIds.includes(id);
        if (currentFollowing === value) {
          changed = true;
          continue;
        }
        next[id] = value;
      }
      return changed ? next : prev;
    });
  }, [followingProfileIds]);

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
