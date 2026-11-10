import type { UsernameAvailabilityResponse } from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  getUsernameStatus,
  MIN_USERNAME_LENGTH,
} from '../../ProfileOnboarding/profileOnboardingDraft';
import { MAX_USERNAME_LENGTH } from '../../ProfileOnboarding/generateUsername';

/**
 * Server codes that change the copy. `UNAVAILABLE` and `TAKEN` both mean
 * "someone else has this"; `RESERVED` gets its own copy because the user
 * cannot pick it even though nobody owns it.
 */
const INVALID_FORMAT_CODE = 'INVALID_FORMAT';
const RESERVED_CODE = 'RESERVED';

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

  if (isFormatError) {
    return strings('social_leaderboard.manage_profile.username_invalid');
  }

  const isReserved = availability.errors.some(
    (error) => error.code === RESERVED_CODE,
  );

  return strings(
    isReserved
      ? 'social_leaderboard.manage_profile.username_reserved'
      : 'social_leaderboard.manage_profile.username_unavailable',
  );
};
