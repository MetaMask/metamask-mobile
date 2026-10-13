import { useQuery } from '@metamask/react-data-query';
import type {
  FetchFollowersOptions,
  FollowersResponse,
} from '@metamask/social-controllers';
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
   * When set, load that trader's followers (`SocialService:fetchFollowers`).
   * When omitted, load the authenticated user's inbound list
   * (`SocialService:fetchMyFollowers`).
   */
  addressOrId?: string;
  /**
   * When true with `addressOrId`, request mutual followers only
   * (`?mutuals=true`). Ignored for the `/users/me` list.
   */
  mutuals?: boolean;
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

export const buildFollowersQueryKey = (
  options: FetchFollowersOptions,
): ['SocialService:fetchFollowers', FetchFollowersOptions] => [
  'SocialService:fetchFollowers',
  options.mutuals === true
    ? { addressOrId: options.addressOrId, mutuals: true }
    : { addressOrId: options.addressOrId },
];

const mapFollowers = (data: FollowersResponse | undefined) => {
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
};

/**
 * Fetches inbound followers for the current user or another trader.
 *
 * Omit `addressOrId` for `GET /users/me/followers`. Pass `addressOrId` for
 * `GET /traders/:addressOrId/followers`, and `mutuals: true` for the
 * inbound intersection with the authenticated viewer.
 *
 * @param options - Optional configuration.
 * @returns The follower list plus loading/error/refresh helpers.
 */
export const useFollowers = (
  options?: UseFollowersOptions,
): UseFollowersResult => {
  const enabled = options?.enabled ?? true;
  const addressOrId = options?.addressOrId;
  const mutualsOnly = options?.mutuals === true && Boolean(addressOrId);
  const queryKey = addressOrId
    ? buildFollowersQueryKey({
        addressOrId,
        mutuals: mutualsOnly,
      })
    : MY_FOLLOWERS_QUERY_KEY;
  const operation = addressOrId
    ? mutualsOnly
      ? 'fetch_mutual_followers'
      : 'fetch_followers'
    : 'fetch_my_followers';

  const { data, isLoading, error, refetch } = useQuery<FollowersResponse>({
    queryKey,
    enabled,
  });

  useLogSocialQueryError(error, {
    surface: 'followed_traders',
    operation,
    extraMessage: 'Followers fetch failed',
    source: FOLLOWERS_SOURCE,
    endpoint: 'followers',
  });

  const followers = useMemo<FollowerConnection[]>(
    () => mapFollowers(data),
    [data],
  );

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
