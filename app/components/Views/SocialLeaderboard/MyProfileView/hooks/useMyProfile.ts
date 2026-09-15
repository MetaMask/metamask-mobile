import { useCallback } from 'react';

export type ProfileRankingTag = 'shrimp' | 'dolphin' | 'whale';

export interface MySocialProfile {
  profileId: string;
  displayName: string;
  handle: string;
  bio?: string | null;
  imageUrl?: string | null;
  rankingTag?: ProfileRankingTag | null;
  xHandle?: string | null;
  followerCount?: number | null;
  followingCount?: number | null;
  shareUrl: string;
}

export interface UseMyProfileResult {
  profile: MySocialProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Temporary owner-profile data seam.
 *
 * Replace the mock with the authenticated social profile query once the API
 * exposes current-user identity. Keeping the query-like result contract here
 * lets both the SocialV1 avatar and My Profile screen migrate together.
 */
export const useMyProfile = (): UseMyProfileResult => {
  const refresh = useCallback(async () => undefined, []);

  return {
    profile: {
      profileId: 'current-user',
      displayName: 'Giga Whale',
      handle: 'giga-whale.metamask',
      bio: 'Trading in the open. Copy my moves or fade them, either way we learn.',
      imageUrl: null,
      rankingTag: 'whale',
      xHandle: 'giga-whale',
      followerCount: 0,
      followingCount: 0,
      shareUrl: 'https://metamask.io/social/giga-whale',
    },
    isLoading: false,
    error: null,
    refresh,
  };
};
