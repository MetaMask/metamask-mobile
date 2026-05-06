import { useCallback, useEffect } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type {
  TraderProfileResponse,
  FetchTraderProfileOptions,
} from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';
import { useFollowToggle } from '../../../../hooks/useFollowToggle';

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

  const { isFollowing, toggleFollow } = useFollowToggle(addressOrId);

  const profile = data ?? null;

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
