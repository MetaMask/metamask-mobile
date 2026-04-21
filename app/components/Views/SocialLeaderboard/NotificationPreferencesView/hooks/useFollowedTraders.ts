import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type { FollowingResponse } from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';

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
      Logger.error(err as Error, 'useFollowedTraders: refresh failed');
      throw err;
    }
  }, [refetch]);

  useEffect(() => {
    if (error) {
      Logger.error(
        error as Error,
        'useFollowedTraders: following fetch failed',
      );
    }
  }, [error]);

  return {
    traders,
    isLoading: enabled && isLoading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    refresh,
  };
};

export default useFollowedTraders;
