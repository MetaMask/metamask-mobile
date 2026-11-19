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
): boolean => availability.errors.some((error) => codes.includes(error.code));

/** Whether the server refused the handle because it is reserved. */
export const isReservedHandle = (
  availability: UsernameAvailabilityResponse,
): boolean => hasCode(availability, RESERVED_CODES);

/** Whether the server refused the handle because of its characters. */
export const isInvalidFormatHandle = (
  availability: UsernameAvailabilityResponse,
): boolean =>
  !availability.valid || hasCode(availability, INVALID_FORMAT_CODES);

/** Why the server refused a handle; `null` when it can be claimed. */
export type HandleAvailabilityRejection =
  | 'invalidFormat'
  | 'reserved'
  | 'unavailable';

/**
 * Classifies a server refusal once for every surface that shows handle copy.
 * The format codes are read even when `valid` is true, because a catalogue
 * spelling of the same refusal must not read as "someone else has this".
 */
export const getHandleAvailabilityRejection = (
  availability: UsernameAvailabilityResponse,
): HandleAvailabilityRejection | null => {
  if (availability.valid && availability.available) {
    return null;
  }

  if (isInvalidFormatHandle(availability)) {
    return 'invalidFormat';
  }

  return isReservedHandle(availability) ? 'reserved' : 'unavailable';
};

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
 *
 * A reserved handle keeps its own branch and key. It reads the same as a
 * taken one: from the user's side both just mean the handle is not
 * available, and "reserved" invites a fruitless retry.
 */
export const getHandleAvailabilityError = (
  availability: UsernameAvailabilityResponse,
): string | null => {
  switch (getHandleAvailabilityRejection(availability)) {
    case null:
      return null;
    case 'invalidFormat':
      return strings('social_leaderboard.manage_profile.username_invalid');
    case 'reserved':
      return strings('social_leaderboard.manage_profile.username_reserved');
    default:
      return strings('social_leaderboard.manage_profile.username_unavailable');
  }
};
