import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../locales/i18n';
import { getXAccountDisconnectError } from './xAccountDisconnectError';

const profileApiError = (code: string, httpStatus = 401): ProfileServiceError =>
  new ProfileServiceError(
    httpStatus,
    `ProfileService: failed to disconnect X account: ${httpStatus}`,
    { code },
  );

describe('getXAccountDisconnectError', () => {
  it('returns the session-expired copy for an auth code', () => {
    const error = profileApiError(ProfileApiErrorCode.AuthTokenExpired);

    const result = getXAccountDisconnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.session_expired'),
    );
  });

  it('returns the rate-limit copy for a throttled request', () => {
    const error = profileApiError(ProfileApiErrorCode.RateLimitExceeded, 429);

    const result = getXAccountDisconnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.rate_limited'),
    );
  });

  it('returns null for a code without disconnect copy', () => {
    const error = profileApiError(ProfileApiErrorCode.ServiceUnavailable, 503);

    const result = getXAccountDisconnectError(error);

    expect(result).toBeNull();
  });

  it('returns null for an error without the service envelope', () => {
    const result = getXAccountDisconnectError(new Error('network'));

    expect(result).toBeNull();
  });
});
