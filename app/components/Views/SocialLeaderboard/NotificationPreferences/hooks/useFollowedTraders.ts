import { useCallback, useMemo } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type { FollowingResponse } from '@metamask/social-controllers';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';

export interface FollowedTrader {
  /** Clicker profile ID. */
  id: string;
  /** Display name or truncated address. */
  username: string;
  /** Profile avatar URL, if any. */
  avatarUri?: string;
}

export interface UseFollowedTradersOptions {
  /**
   * When false, skip fetching. Useful to gate the request behind a
   * feature flag or a parent `enabled` condition.
   *
   * Defaults to true.
   */
  enabled?: boolean;
}

export interface UseFollowedTradersResult {
  traders: FollowedTrader[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_TRADERS: FollowedTrader[] = [];

const FOLLOWED_TRADERS_SOURCE = 'useFollowedTraders';

/**
 * Fetches the list of traders the current user follows, with their
 * full profile summary (name + avatar).
 *
 * Source of truth is `SocialService:fetchFollowing`. The caller is
 * identified server-side from the JWT attached by SocialService, so no
 * profileId needs to be resolved or passed from the UI.
 *
 * @param options - Optional configuration.
 * @returns The followed traders list plus loading/error/refresh helpers.
 */
export const useFollowedTraders = (
  options?: UseFollowedTradersOptions,
): UseFollowedTradersResult => {
  const enabled = options?.enabled ?? true;

  const { data, isLoading, error, refetch } = useQuery<FollowingResponse>({
    queryKey: ['SocialService:fetchFollowing'],
    enabled,
  });

  useLogSocialQueryError(error, {
    surface: 'followed_traders',
    operation: 'fetch_following',
    extraMessage: 'Followed traders fetch failed',
    source: FOLLOWED_TRADERS_SOURCE,
    endpoint: 'following',
  });

  const traders = useMemo<FollowedTrader[]>(() => {
    if (!data?.following) {
      return EMPTY_TRADERS;
    }
    return data.following.map((profile) => ({
      id: profile.profileId,
      username: profile.name,
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
          extraMessage: 'Followed traders refresh failed',
          source: FOLLOWED_TRADERS_SOURCE,
          endpoint: 'following',
        },
        { breadcrumb: false },
      );
      throw err;
    }
  }, [refetch]);

  return {
    traders,
    isLoading: enabled && isLoading,
    error: formatSocialQueryErrorMessage(error),
    refresh,
  };
};

export default useFollowedTraders;
