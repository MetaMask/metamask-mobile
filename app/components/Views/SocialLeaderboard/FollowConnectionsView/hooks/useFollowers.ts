import { useQuery } from '@metamask/react-data-query';
import type { FollowersResponse } from '@metamask/social-controllers';
import { useCallback, useMemo } from 'react';
import { formatAddress } from '../../../../../util/address';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import type { FollowerConnection } from './types';

export interface UseFollowersOptions {
  /**
   * When false, skip fetching. Useful to gate the request behind a
   * feature flag or a parent `enabled` condition.
   *
   * Defaults to true.
   */
  enabled?: boolean;
}

export interface UseFollowersResult {
  followers: FollowerConnection[];
  count: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_FOLLOWERS: FollowerConnection[] = [];

const FOLLOWERS_SOURCE = 'useFollowers';

export const MY_FOLLOWERS_QUERY_KEY = [
  'SocialService:fetchMyFollowers',
] as const;

/**
 * Fetches the traders following the current user.
 *
 * Source of truth is `SocialService:fetchMyFollowers`. The caller is
 * identified server-side from the JWT attached by SocialService, so no
 * profileId needs to be resolved or passed from the UI.
 *
 * @param options - Optional configuration.
 * @returns The follower list plus loading/error/refresh helpers.
 */
export const useFollowers = (
  options?: UseFollowersOptions,
): UseFollowersResult => {
  const enabled = options?.enabled ?? true;

  const { data, isLoading, error, refetch } = useQuery<FollowersResponse>({
    queryKey: MY_FOLLOWERS_QUERY_KEY,
    enabled,
  });

  useLogSocialQueryError(error, {
    surface: 'followed_traders',
    operation: 'fetch_my_followers',
    extraMessage: 'Followers fetch failed',
    source: FOLLOWERS_SOURCE,
    endpoint: 'followers',
  });

  const followers = useMemo<FollowerConnection[]>(() => {
    if (!data?.followers) {
      return EMPTY_FOLLOWERS;
    }
    return data.followers.map((profile) => ({
      id: profile.profileId,
      username: profile.name,
      handle: formatAddress(profile.address, 'short'),
      address: profile.address,
      avatarUri: profile.imageUrl ?? undefined,
    }));
  }, [data]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      reportSocialServiceFailure(
        err,
        {
          surface: 'followed_traders',
          operation: 'refresh',
          extraMessage: 'Followers refresh failed',
          source: FOLLOWERS_SOURCE,
          endpoint: 'followers',
        },
        { breadcrumb: false },
      );
      throw err;
    }
  }, [refetch]);

  return {
    followers,
    count: data?.count ?? followers.length,
    isLoading: enabled && isLoading,
    error: formatSocialQueryErrorMessage(error),
    refresh,
  };
};

export default useFollowers;
