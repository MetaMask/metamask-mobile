import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  TraderProfileResponse,
  FetchTraderProfileOptions,
} from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectFollowingProfileIds } from '../../../../../selectors/socialController';

export interface UseTraderProfileOptions {
  refetchInterval?: number;
}

export interface UseTraderProfileResult {
  profile: TraderProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  isFollowing: boolean;
  toggleFollow: () => void;
  refresh: () => Promise<void>;
}

export const useTraderProfile = (
  addressOrId: string,
  options?: UseTraderProfileOptions,
): UseTraderProfileResult => {
  const fetchOptions: FetchTraderProfileOptions = { addressOrId };

  const queryKey: [string, FetchTraderProfileOptions] = [
    'SocialService:fetchTraderProfile',
    fetchOptions,
  ];

  const { data, isLoading, error, refetch } = useQuery<TraderProfileResponse>({
    queryKey,
    enabled: Boolean(addressOrId),
    refetchInterval: options?.refetchInterval,
  });

  const followingProfileIds = useSelector(selectFollowingProfileIds);
  const reduxFollowing = followingProfileIds.includes(addressOrId);

  // Optimistic follow value reflects user intent instantly; cleared once
  // Redux catches up or if the API call fails.
  const [optimisticFollow, setOptimisticFollow] = useState<boolean | null>(
    null,
  );
  const inflightRef = useRef(false);

  const isFollowing = optimisticFollow ?? reduxFollowing;
  const profile = data ?? null;

  const toggleFollow = useCallback(async () => {
    if (inflightRef.current) {
      return;
    }
    inflightRef.current = true;
    const nextValue = !isFollowing;
    setOptimisticFollow(nextValue);
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
      setOptimisticFollow(null);
      Logger.error(err as Error, 'useTraderProfile: toggleFollow failed');
    } finally {
      inflightRef.current = false;
    }
  }, [isFollowing, addressOrId]);

  useEffect(() => {
    if (optimisticFollow !== null && reduxFollowing === optimisticFollow) {
      setOptimisticFollow(null);
    }
  }, [optimisticFollow, reduxFollowing]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      Logger.error(err as Error, 'useTraderProfile: refresh failed');
      throw err;
    }
  }, [refetch]);

  useEffect(() => {
    if (error) {
      Logger.error(error as Error, 'useTraderProfile: profile fetch failed');
    }
  }, [error]);

  return {
    profile,
    isLoading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    isFollowing,
    toggleFollow,
    refresh,
  };
};

export default useTraderProfile;
