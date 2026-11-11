import type { Profile } from '@metamask/profile-controller';
import { isProfileNotFoundError } from '../MyProfileView/utils/isProfileNotFoundError';
import { recordSocialTermsAcceptanceForExistingProfile } from '../terms/socialTermsAcceptance';

/**
 * `no-session` means there is no profile id to look up, so the server cannot
 * say whether a profile exists.
 */
export type ExistingSocialProfileLookupResult =
  | 'found'
  | 'not-found'
  | 'no-session';

/**
 * Loads the session's Social profile into ProfileController.
 *
 * A fresh install starts with an empty ProfileController even when the SRP
 * already owns a profile, and the Social entry gates only read that state.
 * When a profile is found, an install with no stored terms acceptance records
 * the current version, because the profile already accepted it.
 *
 * @param profileId - Session profile id, or undefined when signed out.
 * @param fetchAndUpdateProfile - Reads the profile and writes it to ProfileController.
 * @returns Whether the profile exists. Errors other than a 404 are rethrown.
 */
export const lookUpExistingSocialProfile = async (
  profileId: string | undefined,
  fetchAndUpdateProfile: (profileId: string) => Promise<Profile>,
): Promise<ExistingSocialProfileLookupResult> => {
  const trimmedProfileId = profileId?.trim();
  if (!trimmedProfileId) {
    return 'no-session';
  }
  try {
    const profile = await fetchAndUpdateProfile(trimmedProfileId);
    if (!profile?.profileId) {
      return 'not-found';
    }
  } catch (error) {
    if (isProfileNotFoundError(error)) {
      return 'not-found';
    }
    throw error;
  }
  recordSocialTermsAcceptanceForExistingProfile({ profileLoaded: true });
  return 'found';
};
