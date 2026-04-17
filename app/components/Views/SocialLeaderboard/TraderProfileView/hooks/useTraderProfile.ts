import { useCallback, useEffect } from 'react';
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

  const isFollowing = followingProfileIds.includes(addressOrId);
  const profile = data ?? null;

  const toggleFollow = useCallback(async () => {
    try {
      const { profileId } =
        await Engine.context.AuthenticationController.getSessionProfile();
      const opts = { addressOrUid: profileId, targets: [addressOrId] };
      if (isFollowing) {
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
      Logger.error(err as Error, 'useTraderProfile: toggleFollow failed');
    }
  }, [isFollowing, addressOrId]);

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
