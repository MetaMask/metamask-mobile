import { useCallback, useSyncExternalStore } from 'react';
import {
  getLocalSocialProfileSnapshot,
  subscribeLocalSocialProfile,
} from './localSocialProfileStore';

export type ProfileRankingTag = 'shrimp' | 'dolphin' | 'whale';

export interface MySocialProfile {
  profileId: string;
  displayName: string;
  handle: string;
  bio?: string | null;
  imageUrl?: string | null;
  /** Local onboarding preset. Ignored once `imageUrl` is a remote avatar. */
  avatarPresetId?: string | null;
  rankingTag?: ProfileRankingTag | null;
  xHandle?: string | null;
  followerCount?: number | null;
  followingCount?: number | null;
  shareUrl: string;
  /** Whole-percent win rate (e.g. 60). Swap for profile-endpoint stats later. */
  winRatePercent?: number | null;
  /** Realized P&L in USD. */
  pnlUsd?: number | null;
  /** Preformatted hold-time label until median minutes land on the API. */
  holdTimeLabel?: string | null;
  timesCopied?: number | null;
  /** 30d trading volume in USD until the profile endpoint is authoritative. */
  volumeUsd30d?: number | null;
  /** 30d trade count until the profile endpoint is authoritative. */
  tradeCount30d?: number | null;
  /** Preformatted profile-age label for the stats sheet (no API field yet). */
  profileAgeLabel?: string | null;
  /** Whole-percent copy success rate for the stats sheet (no API field yet). */
  copySuccessRatePercent?: number | null;
  /** Wallet account chosen during local onboarding. */
  linkedAccountId?: string | null;
  linkedAccountAddress?: string | null;
  shareTradingActivity?: boolean | null;
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
 * The profile lives in an in-memory store so debug reset and onboarding can
 * rewrite it without a backend. Replace the store with the authenticated
 * social profile query once the API exposes current-user identity.
 */
export const useMyProfile = (): UseMyProfileResult => {
  const { profile } = useSyncExternalStore(
    subscribeLocalSocialProfile,
    getLocalSocialProfileSnapshot,
    getLocalSocialProfileSnapshot,
  );
  const refresh = useCallback(async () => undefined, []);

  return {
    profile,
    isLoading: false,
    error: null,
    refresh,
  };
};
