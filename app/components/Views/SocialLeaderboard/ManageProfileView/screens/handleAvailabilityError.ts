import {
  ProfileApiErrorCode,
  type UsernameAvailabilityResponse,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  getUsernameStatus,
  MIN_USERNAME_LENGTH,
} from '../../ProfileOnboarding/profileOnboardingDraft';
import { MAX_USERNAME_LENGTH } from '../../ProfileOnboarding/generateUsername';

/**
 * The availability endpoint answers with short codes (`INVALID_FORMAT`,
 * `RESERVED`); the error envelope for the same refusals uses the catalogue
 * codes. Both are accepted so neither spelling silently falls back to the
 * "someone else has this" copy.
 */
const INVALID_FORMAT_CODES: readonly string[] = [
  'INVALID_FORMAT',
  ProfileApiErrorCode.UsernameInvalidFormat,
];

const RESERVED_CODES: readonly string[] = [
  'RESERVED',
  ProfileApiErrorCode.UsernameReserved,
];

const hasCode = (
  availability: UsernameAvailabilityResponse,
  codes: readonly string[],
): boolean =>
  availability.errors.some((error) => codes.includes(error.code));

/** Whether the server refused the handle because it is reserved. */
export const isReservedHandle = (
  availability: UsernameAvailabilityResponse,
): boolean => hasCode(availability, RESERVED_CODES);

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

  if (!availability.valid || hasCode(availability, INVALID_FORMAT_CODES)) {
    return strings('social_leaderboard.manage_profile.username_invalid');
  }

  return strings(
    isReservedHandle(availability)
      ? 'social_leaderboard.manage_profile.username_reserved'
      : 'social_leaderboard.manage_profile.username_unavailable',
  );
};
