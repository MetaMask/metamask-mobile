import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { selectProfileControllerXProfile } from '../../../../../selectors/profileController';
import { useSessionProfileId } from '../../../../../util/notifications/hooks/useSessionProfileId';
import { useProfileController } from '../../ManageProfileView/hooks/useProfileController';
import {
  getLocalSocialProfileSnapshot,
  subscribeLocalSocialProfile,
} from './localSocialProfileStore';
import { isProfileNotFoundError } from '../utils/isProfileNotFoundError';
import {
  profileControllerToMySocialProfile,
  withLocalAvatarPreset,
} from '../utils/profileControllerToMySocialProfile';

export type ProfileRankingTag = 'shrimp' | 'dolphin' | 'whale';

export interface MySocialProfile {
  profileId: string;
  displayName: string;
  handle: string;
  bio?: string | null;
  imageUrl?: string | null;
  /** Local onboarding preset. Ignored once `imageUrl` is a remote avatar. */
  avatarPresetId?: string | null;
  /** Backdrop color picked with the onboarding preset. */
  avatarBackgroundId?: string | null;
  rankingTag?: ProfileRankingTag | null;
  xHandle?: string | null;
  /** True when X is linked, even if the X account failed to load. */
  connectedToX?: boolean;
  followerCount?: number | null;
  followingCount?: number | null;
  /** Whole-percent win rate (e.g. 60). Swap for profile-endpoint stats later. */
  winRatePercent?: number | null;
  /** Realized P&L in USD. */
  pnlUsd?: number | null;
  /** Wallet account chosen during local onboarding. */
  linkedAccountId?: string | null;
  linkedAccountAddress?: string | null;
  shareTradingActivity?: boolean | null;
  /** ISO timestamp of when the profile was created. */
  joinedAt?: string | null;
}

export interface UseMyProfileResult {
  profile: MySocialProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseMyProfileOptions {
  enabled?: boolean;
}

// Shared across mounts so a remount, like reopening the profile drawer, does
// not wait again on a lookup that already found the profile or a 404.
const resolvedSessionProfileIds = new Set<string>();

/** Test helper. Forgets every resolved profile lookup. */
export const resetResolvedSessionProfileIds = (): void => {
  resolvedSessionProfileIds.clear();
};

/**
 * Owner profile seam.
 *
 * Identity comes from ProfileController. The in-memory store only overlays
 * the onboarding foxicon preset, which the profile API does not store.
 */
export const useMyProfile = ({
  enabled = true,
}: UseMyProfileOptions = {}): UseMyProfileResult => {
  const { profileId: sessionProfileId, isLoading: isSessionLoading } =
    useSessionProfileId();
  const {
    profile: controllerProfile,
    fetchAndUpdateProfile,
    fetchAndUpdateXAccount,
  } = useProfileController();
  const controllerXProfile = useSelector(selectProfileControllerXProfile);
  const { profile } = useSyncExternalStore(
    subscribeLocalSocialProfile,
    getLocalSocialProfileSnapshot,
    getLocalSocialProfileSnapshot,
  );
  const [isHydrating, setIsHydrating] = useState(false);
  const [settledSessionProfileId, setSettledSessionProfileId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const trimmedSessionProfileId = sessionProfileId?.trim() ?? '';

  const refresh = useCallback(async () => {
    const profileId = sessionProfileId?.trim();
    if (!profileId) {
      return;
    }

    setIsHydrating(true);
    setError(null);

    try {
      const fetched = await fetchAndUpdateProfile(profileId);
      resolvedSessionProfileIds.add(profileId);
      if (fetched.connectedToX) {
        try {
          await fetchAndUpdateXAccount();
        } catch {
          // X account is optional; identity still hydrates without it.
        }
      }
    } catch (err) {
      if (isProfileNotFoundError(err)) {
        resolvedSessionProfileIds.add(profileId);
      } else {
        resolvedSessionProfileIds.delete(profileId);
        setError(strings('social_leaderboard.my_profile.load_profile_error'));
      }
    } finally {
      setSettledSessionProfileId(profileId);
      setIsHydrating(false);
    }
  }, [fetchAndUpdateProfile, fetchAndUpdateXAccount, sessionProfileId]);

  useEffect(() => {
    if (!enabled || isSessionLoading || !sessionProfileId?.trim()) {
      return;
    }

    refresh().catch(() => undefined);
  }, [enabled, isSessionLoading, refresh, sessionProfileId]);

  // A stored profile from another session (e.g. before a wallet reset) is
  // never shown. While the session is unresolved, the stored one stays visible.
  const isControllerProfileFromAnotherSession = Boolean(
    controllerProfile &&
      trimmedSessionProfileId &&
      controllerProfile.profileId !== trimmedSessionProfileId,
  );

  const mappedControllerProfile =
    controllerProfile && !isControllerProfileFromAnotherSession
      ? profileControllerToMySocialProfile(
          controllerProfile,
          controllerXProfile,
        )
      : null;

  return {
    profile: mappedControllerProfile
      ? withLocalAvatarPreset(mappedControllerProfile, profile)
      : null,
    isLoading:
      enabled &&
      !resolvedSessionProfileIds.has(trimmedSessionProfileId) &&
      (isSessionLoading ||
        isHydrating ||
        (Boolean(trimmedSessionProfileId) &&
          settledSessionProfileId !== trimmedSessionProfileId)),
    error,
    refresh,
  };
};
