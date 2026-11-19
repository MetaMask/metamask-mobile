import {
  findProfileServiceError,
  ProfileApiErrorCode,
} from '@metamask/profile-controller';
import type { SocialProfileSaveFailureReason } from '../../analytics/socialEvents';

const USERNAME_TAKEN_CODES = new Set<string>([
  ProfileApiErrorCode.UsernameTaken,
  ProfileApiErrorCode.UsernameUnavailable,
  ProfileApiErrorCode.UsernameReserved,
  ProfileApiErrorCode.ProfileAlreadyExists,
]);

const USERNAME_INVALID_CODES = new Set<string>([
  ProfileApiErrorCode.UsernameRequired,
  ProfileApiErrorCode.UsernameTooShort,
  ProfileApiErrorCode.UsernameTooLong,
  ProfileApiErrorCode.UsernameInvalidCharacters,
  ProfileApiErrorCode.UsernameInvalidFormat,
  ProfileApiErrorCode.ValidationFailed,
  ProfileApiErrorCode.ProfileDisplayNameProhibited,
  ProfileApiErrorCode.ProfileDisplayNameNotAllowed,
]);

const CONFLICT_CODES = new Set<string>([
  ProfileApiErrorCode.Conflict,
  ProfileApiErrorCode.ProfileConflict,
  ProfileApiErrorCode.ProfileUpdateConflict,
  ProfileApiErrorCode.XAccountAlreadyLinked,
  ProfileApiErrorCode.XProfileAlreadyLinked,
  ProfileApiErrorCode.XAccountLinkConflict,
]);

const AUTH_CODES = new Set<string>([
  ProfileApiErrorCode.AuthTokenMissing,
  ProfileApiErrorCode.AuthTokenInvalid,
  ProfileApiErrorCode.AuthTokenExpired,
  ProfileApiErrorCode.AuthTokenSubjectMissing,
  ProfileApiErrorCode.AuthVerificationUnavailable,
  ProfileApiErrorCode.AuthEarlyAccessRequired,
  ProfileApiErrorCode.AuthProfileAccessDenied,
]);

/**
 * Coarse Mixpanel bucket for a failed profile create/update during onboarding.
 * Keeps API codes out of the event while still explaining Ready drop-off.
 */
export const resolveProfileSaveFailureReason = (
  error: unknown,
): SocialProfileSaveFailureReason => {
  const code = findProfileServiceError(error)?.code;
  if (!code) {
    return 'unknown';
  }
  if (USERNAME_TAKEN_CODES.has(code)) {
    return 'username_taken';
  }
  if (USERNAME_INVALID_CODES.has(code)) {
    return 'username_invalid';
  }
  if (CONFLICT_CODES.has(code)) {
    return 'conflict';
  }
  if (AUTH_CODES.has(code)) {
    return 'auth';
  }
  if (code === ProfileApiErrorCode.RateLimitExceeded) {
    return 'rate_limit';
  }
  if (
    code === ProfileApiErrorCode.RequestTimeout ||
    code === ProfileApiErrorCode.ServiceUnavailable ||
    code === ProfileApiErrorCode.BadGateway ||
    code === ProfileApiErrorCode.GatewayTimeout
  ) {
    return 'network';
  }
  return 'unknown';
};
