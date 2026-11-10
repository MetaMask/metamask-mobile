import {
  findProfileServiceError,
  ProfileApiErrorCode,
  type ProfileApiErrorCodeId,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';

/**
 * UI copy for the Profile API error codes.
 *
 * The codes, the error envelope, and the error class live in
 * `@metamask/profile-controller` (owned by the Accounts team). This file only
 * maps those codes to this feature's user-facing copy.
 */

/**
 * Codes that mean a profile text field was refused, keyed by the editor field.
 * Fields left out keep the generic save error.
 */
export const PROFILE_FIELD_REJECTION_CODES: Partial<
  Record<string, readonly ProfileApiErrorCodeId[]>
> = {
  displayName: [
    ProfileApiErrorCode.ProfileDisplayNameProhibited,
    ProfileApiErrorCode.ProfileDisplayNameNotAllowed,
  ],
  bio: [ProfileApiErrorCode.ProfileBioProhibited],
};

/** Copy for a refused profile text field, keyed by the editor field. */
export const PROFILE_FIELD_REJECTION_MESSAGE_KEYS: Partial<
  Record<string, string>
> = {
  displayName: 'social_leaderboard.manage_profile.display_name_unavailable',
  bio: 'social_leaderboard.manage_profile.bio_prohibited',
};

/** Copy for the linked-address cooldown refusal. */
export const LINKED_ADDRESS_COOLDOWN_MESSAGE_KEY =
  'social_leaderboard.manage_profile.linked_account_cooldown';

/**
 * Copy for profile save/update failures that are not field-specific. Codes
 * left out keep the generic save error.
 */
export const PROFILE_SAVE_ERROR_MESSAGE_KEYS: Partial<Record<string, string>> = {
  [ProfileApiErrorCode.AuthTokenMissing]:
    'social_leaderboard.manage_profile.session_expired',
  [ProfileApiErrorCode.AuthTokenInvalid]:
    'social_leaderboard.manage_profile.session_expired',
  [ProfileApiErrorCode.AuthTokenExpired]:
    'social_leaderboard.manage_profile.session_expired',
  [ProfileApiErrorCode.AuthTokenSubjectMissing]:
    'social_leaderboard.manage_profile.session_expired',
  [ProfileApiErrorCode.AuthEarlyAccessRequired]:
    'social_leaderboard.manage_profile.access_denied',
  [ProfileApiErrorCode.AuthProfileAccessDenied]:
    'social_leaderboard.manage_profile.access_denied',
  [ProfileApiErrorCode.RateLimitExceeded]:
    'social_leaderboard.manage_profile.rate_limited',
  [ProfileApiErrorCode.ProfileNotFound]:
    'social_leaderboard.manage_profile.profile_not_found',
  [ProfileApiErrorCode.ProfileAlreadyExists]:
    'social_leaderboard.manage_profile.profile_already_exists',
  [ProfileApiErrorCode.ProfileUsernameImmutable]:
    'social_leaderboard.manage_profile.username_immutable',
  [ProfileApiErrorCode.ProfileConflict]:
    'social_leaderboard.manage_profile.profile_changed',
  [ProfileApiErrorCode.ProfileUpdateConflict]:
    'social_leaderboard.manage_profile.profile_changed',
  [ProfileApiErrorCode.UsernameRequired]:
    'social_leaderboard.manage_profile.username_invalid',
  [ProfileApiErrorCode.UsernameInvalidCharacters]:
    'social_leaderboard.manage_profile.username_invalid',
  [ProfileApiErrorCode.UsernameInvalidFormat]:
    'social_leaderboard.manage_profile.username_invalid',
  [ProfileApiErrorCode.UsernameUnavailable]:
    'social_leaderboard.manage_profile.username_unavailable',
  [ProfileApiErrorCode.UsernameReserved]:
    'social_leaderboard.manage_profile.username_reserved',
  [ProfileApiErrorCode.UsernameTaken]:
    'social_leaderboard.manage_profile.username_unavailable',
  [ProfileApiErrorCode.UsernameValidationUnavailable]:
    'social_leaderboard.manage_profile.save_error',
};

/**
 * Copy for the X auth codes that give the user something specific to do.
 * Every other X failure keeps the generic connect error.
 */
export const X_CONNECT_ERROR_MESSAGE_KEYS: Partial<Record<string, string>> = {
  [ProfileApiErrorCode.AuthTokenMissing]:
    'social_leaderboard.manage_profile.session_expired',
  [ProfileApiErrorCode.AuthTokenInvalid]:
    'social_leaderboard.manage_profile.session_expired',
  [ProfileApiErrorCode.AuthTokenExpired]:
    'social_leaderboard.manage_profile.session_expired',
  [ProfileApiErrorCode.AuthTokenSubjectMissing]:
    'social_leaderboard.manage_profile.session_expired',
  [ProfileApiErrorCode.AuthEarlyAccessRequired]:
    'social_leaderboard.manage_profile.access_denied',
  [ProfileApiErrorCode.AuthProfileAccessDenied]:
    'social_leaderboard.manage_profile.access_denied',
  [ProfileApiErrorCode.RateLimitExceeded]:
    'social_leaderboard.manage_profile.rate_limited',
  [ProfileApiErrorCode.XOAuthAccessDenied]:
    'social_leaderboard.manage_profile.x_access_denied',
  [ProfileApiErrorCode.XOAuthStateInvalid]:
    'social_leaderboard.manage_profile.x_connection_expired',
  [ProfileApiErrorCode.XAccountAlreadyLinked]:
    'social_leaderboard.manage_profile.x_account_already_linked',
  [ProfileApiErrorCode.XProfileAlreadyLinked]:
    'social_leaderboard.manage_profile.x_profile_already_linked',
  [ProfileApiErrorCode.XAccountLinkConflict]:
    'social_leaderboard.manage_profile.x_account_link_conflict',
  [ProfileApiErrorCode.Conflict]:
    'social_leaderboard.manage_profile.x_account_link_conflict',
};

/** The generic save copy for a Profile API code, when one is mapped. */
export const getProfileSaveErrorCopy = (error: unknown): string | null => {
  const code = findProfileServiceError(error)?.code;
  const messageKey = code ? PROFILE_SAVE_ERROR_MESSAGE_KEYS[code] : undefined;
  return messageKey ? strings(messageKey) : null;
};
