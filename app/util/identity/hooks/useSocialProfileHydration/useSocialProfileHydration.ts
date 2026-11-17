import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { useProfileController } from '../../../../components/Views/SocialLeaderboard/ManageProfileView/hooks/useProfileController';
import { lookUpExistingSocialProfile } from '../../../../components/Views/SocialLeaderboard/hooks/lookUpExistingSocialProfile';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
  selectSessionProfileId,
} from '../../../../selectors/identity';

/**
 * Loads an existing Social profile into ProfileController once the user is
 * signed in.
 *
 * After a fresh install and SRP import, ProfileController is empty until a
 * screen fetches the profile. The Social entry gates read that state
 * synchronously, so without this an existing user is sent to profile
 * onboarding. Keyed by the session profile id, so another wallet's identity
 * after a reset is looked up again.
 */
export function useSocialProfileHydration(): void {
  const isSignedIn = useSelector(selectIsSignedIn);
  const canonicalProfileId = useSelector(selectCanonicalProfileId);
  const sessionProfileId = useSelector(selectSessionProfileId);
  const isSocialEnabled = useSelector(selectSocialLeaderboardEnabled);
  const { profile, fetchAndUpdateProfile } = useProfileController();
  const profileId = canonicalProfileId || sessionProfileId;
  const attemptedProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isSignedIn ||
      !isSocialEnabled ||
      !profileId ||
      profile ||
      attemptedProfileIdRef.current === profileId
    ) {
      return;
    }

    attemptedProfileIdRef.current = profileId;
    lookUpExistingSocialProfile(profileId, fetchAndUpdateProfile).catch(
      () => undefined,
    );
  }, [fetchAndUpdateProfile, isSignedIn, isSocialEnabled, profile, profileId]);
}
