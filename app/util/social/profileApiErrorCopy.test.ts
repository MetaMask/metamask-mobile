import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../locales/i18n';
import {
  SERVER_ERROR_COPY,
  SESSION_EXPIRED_COPY,
  createProfileApiErrorCopy,
} from './profileApiErrorCopy';

const profileApiError = (code: string, httpStatus = 403): ProfileServiceError =>
  new ProfileServiceError(httpStatus, 'ProfileService: failed', { code });

describe('createProfileApiErrorCopy', () => {
  it('returns the copy for a mapped code', () => {
    const getCopy = createProfileApiErrorCopy({
      copy: {
        [ProfileApiErrorCode.RateLimitExceeded]:
          'social_leaderboard.manage_profile.rate_limited',
      },
    });

    expect(
      getCopy(profileApiError(ProfileApiErrorCode.RateLimitExceeded)),
    ).toBe(strings('social_leaderboard.manage_profile.rate_limited'));
  });

  it('returns null for an unmapped code when there is no fallback', () => {
    const getCopy = createProfileApiErrorCopy({ copy: {} });

    expect(
      getCopy(profileApiError(ProfileApiErrorCode.RateLimitExceeded)),
    ).toBeNull();
  });

  it('returns the fallback for an unmapped code when one is set', () => {
    const getCopy = createProfileApiErrorCopy({
      copy: {},
      fallbackMessageKey:
        'social_leaderboard.profile_onboarding.connect_x_error',
    });

    expect(
      getCopy(profileApiError(ProfileApiErrorCode.RateLimitExceeded)),
    ).toBe(strings('social_leaderboard.profile_onboarding.connect_x_error'));
  });

  it('returns null for an error without the service envelope', () => {
    const getCopy = createProfileApiErrorCopy({ copy: SESSION_EXPIRED_COPY });

    expect(getCopy(new Error('network'))).toBeNull();
  });

  it('fills in the placeholder values for a code that states a number', () => {
    const getCopy = createProfileApiErrorCopy({
      copy: {
        [ProfileApiErrorCode.UsernameTooShort]:
          'social_leaderboard.manage_profile.username_too_short',
      },
      paramsByCode: {
        [ProfileApiErrorCode.UsernameTooShort]: { min: 3 },
      },
    });

    expect(getCopy(profileApiError(ProfileApiErrorCode.UsernameTooShort))).toBe(
      strings('social_leaderboard.manage_profile.username_too_short', {
        min: 3,
      }),
    );
  });

  it('finds the code through a wrapper error', () => {
    const getCopy = createProfileApiErrorCopy({ copy: SERVER_ERROR_COPY });
    const wrapped = new Error('wrapped', {
      cause: profileApiError(ProfileApiErrorCode.InternalError, 500),
    });

    expect(getCopy(wrapped)).toBe(
      strings('social_leaderboard.manage_profile.server_error'),
    );
  });
});

describe('shared code groups', () => {
  it('gives every auth-token refusal the session-expired copy', () => {
    for (const code of [
      ProfileApiErrorCode.AuthTokenMissing,
      ProfileApiErrorCode.AuthTokenInvalid,
      ProfileApiErrorCode.AuthTokenExpired,
      ProfileApiErrorCode.AuthTokenSubjectMissing,
    ]) {
      expect(SESSION_EXPIRED_COPY[code]).toBe(
        'social_leaderboard.manage_profile.session_expired',
      );
    }
  });

  it('gives every upstream fault the server-error copy', () => {
    for (const code of [
      ProfileApiErrorCode.NotImplemented,
      ProfileApiErrorCode.BadGateway,
      ProfileApiErrorCode.ServiceUnavailable,
      ProfileApiErrorCode.GatewayTimeout,
      ProfileApiErrorCode.RequestTimeout,
      ProfileApiErrorCode.InternalError,
    ]) {
      expect(SERVER_ERROR_COPY[code]).toBe(
        'social_leaderboard.manage_profile.server_error',
      );
    }
  });
});
