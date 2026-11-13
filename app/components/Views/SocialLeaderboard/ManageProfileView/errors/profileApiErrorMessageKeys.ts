import {
  ProfileApiErrorCode,
  type ProfileApiErrorCodeId,
} from '@metamask/profile-controller';
import { MIN_USERNAME_LENGTH } from '../../ProfileOnboarding/profileOnboardingDraft';
import { MAX_USERNAME_LENGTH } from '../../ProfileOnboarding/generateUsername';
import {
  SESSION_EXPIRED_COPY,
  SERVER_ERROR_COPY,
  createProfileApiErrorCopy,
} from '../../../../../util/social/profileApiErrorCopy';

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

/**
 * Copy for the linked-address cooldown refusal. The day count picks the `one`
 * or `other` form; a refusal with no count falls back to the policy window,
 * which is the window the screen's footnote states.
 */
export const LINKED_ADDRESS_COOLDOWN_MESSAGE_KEYS = {
  one: 'social_leaderboard.manage_profile.linked_account_cooldown_one',
  other: 'social_leaderboard.manage_profile.linked_account_cooldown_other',
  noDayCount: 'social_leaderboard.manage_profile.linked_account_cooldown',
} as const;

/** The window the API enforces, used when a refusal carries no day count. */
export const LINKED_ADDRESS_COOLDOWN_POLICY_DAYS = 30;

/**
 * Copy for profile save/update failures that are not field-specific. Codes
 * left out keep the generic save error.
 */
export const PROFILE_SAVE_ERROR_MESSAGE_KEYS = {
  ...SESSION_EXPIRED_COPY,
  ...SERVER_ERROR_COPY,
  [ProfileApiErrorCode.AuthEarlyAccessRequired]:
    'social_leaderboard.manage_profile.social_profiles_unavailable',
  [ProfileApiErrorCode.AuthProfileAccessDenied]:
    'social_leaderboard.manage_profile.save_retry',
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
  [ProfileApiErrorCode.Conflict]:
    'social_leaderboard.manage_profile.profile_changed',
  [ProfileApiErrorCode.UsernameRequired]:
    'social_leaderboard.manage_profile.username_invalid',
  [ProfileApiErrorCode.UsernameInvalidCharacters]:
    'social_leaderboard.manage_profile.username_invalid',
  [ProfileApiErrorCode.UsernameInvalidFormat]:
    'social_leaderboard.manage_profile.username_invalid',
  [ProfileApiErrorCode.UsernameTooShort]:
    'social_leaderboard.manage_profile.username_too_short',
  [ProfileApiErrorCode.UsernameTooLong]:
    'social_leaderboard.manage_profile.username_too_long',
  [ProfileApiErrorCode.UsernameUnavailable]:
    'social_leaderboard.manage_profile.username_unavailable',
  [ProfileApiErrorCode.UsernameReserved]:
    'social_leaderboard.manage_profile.username_reserved',
  [ProfileApiErrorCode.UsernameTaken]:
    'social_leaderboard.manage_profile.username_unavailable',
  [ProfileApiErrorCode.UsernameValidationUnavailable]:
    'social_leaderboard.manage_profile.handle_check_unavailable',
  [ProfileApiErrorCode.ValidationFailed]:
    'social_leaderboard.manage_profile.input_rejected',
};

/**
 * Copy for a failed profile create on onboarding's last screen. The create
 * step has its own retry wording, so it is the save map plus the codes that
 * read differently there. `PROFILE_NOT_FOUND` and `PROFILE_USERNAME_IMMUTABLE`
 * come along in the spread but cannot be returned while creating.
 */
export const PROFILE_CREATE_ERROR_MESSAGE_KEYS = {
  ...PROFILE_SAVE_ERROR_MESSAGE_KEYS,
  [ProfileApiErrorCode.AuthProfileAccessDenied]:
    'social_leaderboard.manage_profile.create_retry',
  [ProfileApiErrorCode.ProfileConflict]:
    'social_leaderboard.manage_profile.create_retry',
  [ProfileApiErrorCode.ProfileUpdateConflict]:
    'social_leaderboard.manage_profile.create_retry',
  [ProfileApiErrorCode.Conflict]:
    'social_leaderboard.manage_profile.create_retry',
  [ProfileApiErrorCode.ProfileDisplayNameProhibited]:
    'social_leaderboard.manage_profile.display_name_unavailable',
  [ProfileApiErrorCode.ProfileDisplayNameNotAllowed]:
    'social_leaderboard.manage_profile.display_name_unavailable',
};

/**
 * Copy for the X auth codes that give the user something specific to do.
 * Every other X failure keeps the generic connect copy.
 */
export const X_CONNECT_ERROR_MESSAGE_KEYS = {
  ...SESSION_EXPIRED_COPY,
  ...SERVER_ERROR_COPY,
  [ProfileApiErrorCode.AuthEarlyAccessRequired]:
    'social_leaderboard.manage_profile.social_profiles_unavailable',
  [ProfileApiErrorCode.AuthProfileAccessDenied]:
    'social_leaderboard.manage_profile.connect_x_retry',
  [ProfileApiErrorCode.RateLimitExceeded]:
    'social_leaderboard.manage_profile.rate_limited',
  [ProfileApiErrorCode.XOAuthAccessDenied]:
    'social_leaderboard.manage_profile.connect_x_retry',
  [ProfileApiErrorCode.XOAuthStateInvalid]:
    'social_leaderboard.manage_profile.x_connection_expired',
  [ProfileApiErrorCode.XAccountAlreadyLinked]:
    'social_leaderboard.manage_profile.x_account_already_linked',
  [ProfileApiErrorCode.XProfileAlreadyLinked]:
    'social_leaderboard.manage_profile.x_profile_already_linked',
  [ProfileApiErrorCode.XAccountLinkConflict]:
    'social_leaderboard.manage_profile.x_account_link_conflict',
  // A bare CONFLICT is the same refusal as X_ACCOUNT_LINK_CONFLICT.
  [ProfileApiErrorCode.Conflict]:
    'social_leaderboard.manage_profile.x_account_link_conflict',
};

/** The length copy states the allowed range, so it needs the same numbers the on-device rules use. */
const USERNAME_LENGTH_PARAMS = {
  [ProfileApiErrorCode.UsernameTooShort]: { min: MIN_USERNAME_LENGTH },
  [ProfileApiErrorCode.UsernameTooLong]: { max: MAX_USERNAME_LENGTH },
};

/** The save copy for a Profile API error, when its code is mapped. */
export const getProfileSaveErrorCopy = createProfileApiErrorCopy({
  copy: PROFILE_SAVE_ERROR_MESSAGE_KEYS,
  paramsByCode: USERNAME_LENGTH_PARAMS,
});

/** The create-profile copy for a Profile API error, when its code is mapped. */
export const getProfileCreateErrorCopy = createProfileApiErrorCopy({
  copy: PROFILE_CREATE_ERROR_MESSAGE_KEYS,
  paramsByCode: USERNAME_LENGTH_PARAMS,
});
