import { ProfileApiErrorCode } from '@metamask/profile-controller';
import { resolveProfileSaveFailureReason } from './resolveProfileSaveFailureReason';

const profileError = (code: string) => {
  const error = new Error(code) as Error & { code: string };
  error.code = code;
  return error;
};

jest.mock('@metamask/profile-controller', () => {
  const actual = jest.requireActual('@metamask/profile-controller');
  return {
    ...actual,
    findProfileServiceError: (error: unknown) => {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'string'
      ) {
        return error;
      }
      return undefined;
    },
  };
});

describe('resolveProfileSaveFailureReason', () => {
  it('maps username taken codes', () => {
    expect(
      resolveProfileSaveFailureReason(
        profileError(ProfileApiErrorCode.UsernameTaken),
      ),
    ).toBe('username_taken');
  });

  it('maps username invalid codes', () => {
    expect(
      resolveProfileSaveFailureReason(
        profileError(ProfileApiErrorCode.UsernameInvalidFormat),
      ),
    ).toBe('username_invalid');
  });

  it('maps conflict codes', () => {
    expect(
      resolveProfileSaveFailureReason(
        profileError(ProfileApiErrorCode.ProfileConflict),
      ),
    ).toBe('conflict');
  });

  it('maps auth codes', () => {
    expect(
      resolveProfileSaveFailureReason(
        profileError(ProfileApiErrorCode.AuthTokenExpired),
      ),
    ).toBe('auth');
  });

  it('maps rate limit', () => {
    expect(
      resolveProfileSaveFailureReason(
        profileError(ProfileApiErrorCode.RateLimitExceeded),
      ),
    ).toBe('rate_limit');
  });

  it('maps network codes', () => {
    expect(
      resolveProfileSaveFailureReason(
        profileError(ProfileApiErrorCode.ServiceUnavailable),
      ),
    ).toBe('network');
  });

  it('returns unknown without a profile API code', () => {
    expect(resolveProfileSaveFailureReason(new Error('network'))).toBe(
      'unknown',
    );
  });
});
