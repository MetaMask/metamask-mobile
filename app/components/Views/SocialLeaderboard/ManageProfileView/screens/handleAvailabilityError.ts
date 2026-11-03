import type { UsernameAvailabilityResponse } from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  getUsernameStatus,
  MIN_USERNAME_LENGTH,
} from '../../ProfileOnboarding/profileOnboardingDraft';
import { MAX_USERNAME_LENGTH } from '../../ProfileOnboarding/generateUsername';

/**
 * The one server code that means the handle broke a rule rather than being
 * spoken for. `UNAVAILABLE`, `RESERVED`, and `TAKEN` all read to the user as
 * "someone else has this".
 */
const INVALID_FORMAT_CODE = 'INVALID_FORMAT';

/** The local rule that fails before the server is asked, or null when it passes. */
export const getHandleLocalRuleError = (value: string): string | null => {
  const status = getUsernameStatus(value);
  if (status === 'empty' || status === 'tooShort') {
    return strings('social_leaderboard.manage_profile.username_too_short', {
      min: MIN_USERNAME_LENGTH,
    });
  }
  if (status === 'tooLong') {
    return strings('social_leaderboard.manage_profile.username_too_long', {
      max: MAX_USERNAME_LENGTH,
    });
  }
  if (status === 'invalid') {
    return strings('social_leaderboard.manage_profile.username_invalid');
  }
  return null;
};

/**
 * The copy for a rejected handle, chosen from the server's error code. A
 * response that carries no code keeps the older behaviour: an invalid handle
 * reports the character rule, anything else reports unavailable.
 */
export const getHandleAvailabilityError = (
  availability: UsernameAvailabilityResponse,
): string | null => {
  if (availability.valid && availability.available) {
    return null;
  }

  const isFormatError =
    !availability.valid ||
    availability.errors.some((error) => error.code === INVALID_FORMAT_CODE);

  return strings(
    isFormatError
      ? 'social_leaderboard.manage_profile.username_invalid'
      : 'social_leaderboard.manage_profile.username_unavailable',
  );
};
