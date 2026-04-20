import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type {
  FetchFollowingOptions,
  FollowingResponse,
} from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
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
 * Source of truth is `SocialService:fetchFollowing` (backed by the
 * `GET /v1/users/:addressOrUid/following` endpoint). The current
 * user's profile ID is resolved once via `AuthenticationController`
 * and then cached so the query key stays stable across re-renders.
 *
 * @param options - Optional configuration.
 * @returns The followed traders list plus loading/error/refresh helpers.
 */
export const useFollowedTraders = (
  options?: UseFollowedTradersOptions,
): UseFollowedTradersResult => {
  const enabled = options?.enabled ?? true;

  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileIdError, setProfileIdError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const session =
          await Engine.context.AuthenticationController.getSessionProfile();
        if (!cancelled) {
          setProfileIdError(null);
          setProfileId(session.profileId);
        }
      } catch (err) {
        if (!cancelled) {
          setProfileIdError(err as Error);
          Logger.error(
            err as Error,
            'useFollowedTraders: getSessionProfile failed',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const fetchOptions: FetchFollowingOptions | null = profileId
    ? { addressOrUid: profileId }
    : null;

  const queryKey: [string, FetchFollowingOptions | null] = [
    'SocialService:fetchFollowing',
    fetchOptions,
  ];

  const { data, isLoading, error, refetch } = useQuery<FollowingResponse>({
    queryKey,
    enabled: enabled && Boolean(profileId),
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

  const combinedError = error ?? profileIdError;

  return {
    traders,
    // Treat the pre-query session-profile resolution as part of the loading
    // window so the UI can render a single skeleton rather than flashing.
    isLoading: enabled && (isLoading || (!profileId && !profileIdError)),
    error:
      combinedError instanceof Error
        ? combinedError.message
        : combinedError
          ? String(combinedError)
          : null,
    refresh,
  };
};

export default useFollowedTraders;
