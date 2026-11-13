import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  getProfileCreateErrorCopy,
  getProfileSaveErrorCopy,
} from './profileApiErrorMessageKeys';

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

  it('returns the social-profiles-unavailable copy for an early-access gate', () => {
    const error = profileApiError(
      ProfileApiErrorCode.AuthEarlyAccessRequired,
      403,
    );

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.social_profiles_unavailable'),
    );
  });

  it('returns the save-retry copy for a profile access denial', () => {
    const error = profileApiError(
      ProfileApiErrorCode.AuthProfileAccessDenied,
      403,
    );

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.save_retry'),
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

  it('returns the server-error copy for every upstream failure', () => {
    for (const code of [
      ProfileApiErrorCode.NotImplemented,
      ProfileApiErrorCode.BadGateway,
      ProfileApiErrorCode.ServiceUnavailable,
      ProfileApiErrorCode.GatewayTimeout,
      ProfileApiErrorCode.RequestTimeout,
    ]) {
      expect(getProfileSaveErrorCopy(profileApiError(code, 503))).toBe(
        strings('social_leaderboard.manage_profile.server_error'),
      );
    }
  });

  it('returns the length-rule copy for a handle the API rejects on length', () => {
    expect(
      getProfileSaveErrorCopy(
        profileApiError(ProfileApiErrorCode.UsernameTooShort, 400),
      ),
    ).toBe(
      strings('social_leaderboard.manage_profile.username_too_short', {
        min: 3,
      }),
    );
    expect(
      getProfileSaveErrorCopy(
        profileApiError(ProfileApiErrorCode.UsernameTooLong, 400),
      ),
    ).toBe(
      strings('social_leaderboard.manage_profile.username_too_long', {
        max: 16,
      }),
    );
  });

  it('returns the reserved copy for a reserved handle', () => {
    expect(
      getProfileSaveErrorCopy(
        profileApiError(ProfileApiErrorCode.UsernameReserved, 409),
      ),
    ).toBe(strings('social_leaderboard.manage_profile.username_reserved'));
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

describe('getProfileCreateErrorCopy', () => {
  it('returns the display-name-unavailable copy for a prohibited name', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileDisplayNameProhibited,
      400,
    );

    expect(getProfileCreateErrorCopy(error)).toBe(
      strings('social_leaderboard.manage_profile.display_name_unavailable'),
    );
  });

  it('returns the create-retry copy for a conflicting create', () => {
    const error = profileApiError(ProfileApiErrorCode.Conflict, 409);

    expect(getProfileCreateErrorCopy(error)).toBe(
      strings('social_leaderboard.manage_profile.create_retry'),
    );
  });

  it('returns the unavailable copy for a taken handle', () => {
    const error = profileApiError(ProfileApiErrorCode.UsernameTaken, 409);

    expect(getProfileCreateErrorCopy(error)).toBe(
      strings('social_leaderboard.manage_profile.username_unavailable'),
    );
  });

  it('returns the reserved copy for a reserved handle on the create step', () => {
    const error = profileApiError(ProfileApiErrorCode.UsernameReserved, 409);

    expect(getProfileCreateErrorCopy(error)).toBe(
      strings('social_leaderboard.manage_profile.username_reserved'),
    );
  });

  it('returns the too-short copy for a short handle', () => {
    const error = profileApiError(ProfileApiErrorCode.UsernameTooShort, 400);

    expect(getProfileCreateErrorCopy(error)).toBe(
      strings('social_leaderboard.manage_profile.username_too_short', {
        min: 3,
      }),
    );
  });

  it('returns the too-long copy for a long handle', () => {
    const error = profileApiError(ProfileApiErrorCode.UsernameTooLong, 400);

    expect(getProfileCreateErrorCopy(error)).toBe(
      strings('social_leaderboard.manage_profile.username_too_long', {
        max: 16,
      }),
    );
  });

  it('returns the server-error copy for a server fault', () => {
    const error = profileApiError(ProfileApiErrorCode.InternalError, 500);

    expect(getProfileCreateErrorCopy(error)).toBe(
      strings('social_leaderboard.manage_profile.server_error'),
    );
  });

  it('returns null for a code without create copy', () => {
    const error = profileApiError(
      ProfileApiErrorCode.AuthVerificationUnavailable,
      401,
    );

    expect(getProfileCreateErrorCopy(error)).toBeNull();
  });

  it('returns null for an error without the service envelope', () => {
    expect(getProfileCreateErrorCopy(new Error('network'))).toBeNull();
  });
});
