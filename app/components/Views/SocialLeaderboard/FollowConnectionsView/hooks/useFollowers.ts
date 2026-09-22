import { useCallback } from 'react';
import { PLACEHOLDER_FOLLOWERS } from './placeholderFollowers';
import type { FollowerConnection } from './types';

export interface UseFollowersResult {
  followers: FollowerConnection[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Followers for the current user's profile connections screen.
 *
 * Replace the placeholder list with `SocialService:fetchFollowers` (or the
 * authenticated profile followers query) when the API is available.
 */
export const useFollowers = (): UseFollowersResult => {
  const refresh = useCallback(async () => undefined, []);

  return {
    followers: PLACEHOLDER_FOLLOWERS,
    isLoading: false,
    error: null,
    refresh,
  };
};
