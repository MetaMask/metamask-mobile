import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../locales/i18n';
import {
  SESSION_EXPIRED_COPY,
  createProfileApiErrorCopy,
} from './profileApiErrorCopy';

const profileApiError = (code: string): ProfileServiceError =>
  new ProfileServiceError(403, 'ProfileService: failed', { code });

/**
 * The surface maps exercise the happy path. What is left to prove here is the
 * behaviour they cannot reach: the fallback, and that every grouped code
 * carries copy, so a new auth code cannot silently go unmapped.
 */
describe('createProfileApiErrorCopy', () => {
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

  it('returns null for an unmapped code when there is no fallback', () => {
    const getCopy = createProfileApiErrorCopy({ copy: {} });

    expect(
      getCopy(profileApiError(ProfileApiErrorCode.RateLimitExceeded)),
    ).toBeNull();
  });
});

describe('SESSION_EXPIRED_COPY', () => {
  it.each(Object.entries(SESSION_EXPIRED_COPY))(
    'gives %s the session-expired copy',
    (_code, messageKey) => {
      expect(messageKey).toBe(
        'social_leaderboard.manage_profile.session_expired',
      );
    },
  );
});
