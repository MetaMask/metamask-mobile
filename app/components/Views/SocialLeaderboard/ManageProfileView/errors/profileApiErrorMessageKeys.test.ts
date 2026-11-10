import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { getProfileSaveErrorCopy } from './profileApiErrorMessageKeys';

const profileApiError = (
  code: string,
  httpStatus = 403,
): ProfileServiceError =>
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

  it('returns the profile-not-found copy for a missing profile', () => {
    const error = profileApiError(ProfileApiErrorCode.ProfileNotFound, 404);

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.profile_not_found'),
    );
  });

  it('returns null for a code without save copy', () => {
    const error = profileApiError(ProfileApiErrorCode.ValidationFailed, 400);

    const result = getProfileSaveErrorCopy(error);

    expect(result).toBeNull();
  });

  it('returns null for an error without the service envelope', () => {
    const result = getProfileSaveErrorCopy(new Error('network'));

    expect(result).toBeNull();
  });
});
