import { useMemo, useCallback, useState, useEffect } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type {
  TraderProfileResponse,
  FetchTraderProfileOptions,
} from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';

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
): UseTraderProfileResult => {
  const fetchOptions: FetchTraderProfileOptions = { addressOrId };

  const queryKey: [string, FetchTraderProfileOptions] = [
    'SocialService:fetchTraderProfile',
    fetchOptions,
  ];

  const { data, isLoading, error, refetch } = useQuery<TraderProfileResponse>({
    queryKey,
    enabled: Boolean(addressOrId),
  });

  const [localFollowOverride, setLocalFollowOverride] = useState<
    boolean | null
  >(null);

  const isFollowing = localFollowOverride ?? false;

  const profile = useMemo(() => data ?? null, [data]);

  const toggleFollow = useCallback(() => {
    setLocalFollowOverride((prev) => !(prev ?? false));
  }, []);

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
