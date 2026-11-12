import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { getProfileSaveErrorCopy } from './profileApiErrorMessageKeys';

const profileApiError = (code: string, httpStatus = 403): ProfileServiceError =>
  new ProfileServiceError(
    httpStatus,
    `ProfileService: failed to update profile: ${httpStatus}`,
    { code },
  );

describe('getProfileSaveErrorCopy', () => {
  it('returns the session-expired copy for an auth code', () => {
    const error = profileApiError(ProfileApiErrorCode.AuthTokenExpired, 401);

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.session_expired'),
    );
  });

  it('returns the rate-limit copy for a throttled request', () => {
    const error = profileApiError(ProfileApiErrorCode.RateLimitExceeded, 429);

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.rate_limited'),
    );
  });

  it('returns the profile-changed copy for a concurrent update', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileUpdateConflict,
      409,
    );

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.profile_changed'),
    );
  });

  it('returns the profile-changed copy for a bare conflict', () => {
    const error = profileApiError(ProfileApiErrorCode.Conflict, 409);

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.profile_changed'),
    );
  });

  it('returns the handle-check copy when validation is unavailable', () => {
    const error = profileApiError(
      ProfileApiErrorCode.UsernameValidationUnavailable,
      503,
    );

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.handle_check_unavailable'),
    );
  });

  it('returns the profile-not-found copy for a missing profile', () => {
    const error = profileApiError(ProfileApiErrorCode.ProfileNotFound, 404);

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.profile_not_found'),
    );
  });

  it('returns the rejected-input copy for a validation failure', () => {
    const error = profileApiError(ProfileApiErrorCode.ValidationFailed, 409);

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.input_rejected'),
    );
  });

  it('returns the server-error copy for a server fault', () => {
    const error = profileApiError(ProfileApiErrorCode.InternalError, 500);

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.server_error'),
    );
  });

  it('returns null for a code without save copy', () => {
    const error = profileApiError(
      ProfileApiErrorCode.AuthVerificationUnavailable,
      401,
    );

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBeNull();
  });

  it('returns null for an error without the service envelope', () => {
    const result = getProfileSaveErrorCopy(new Error('network'));

    expect(result).toBeNull();
  });
});
