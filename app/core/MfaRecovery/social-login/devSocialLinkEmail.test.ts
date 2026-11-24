import StorageWrapper from '../../../store/storage-wrapper';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import {
  applyDevSocialLinkEmail,
  clearDevSocialLinkEmail,
  hydrateDevSocialLinkEmail,
  setDevSocialLinkEmail,
} from './devSocialLinkEmail';

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../util/identity/mfa/isMfaDevBuild', () => ({
  isMfaDevBuild: jest.fn(),
}));

const mockStorage = jest.mocked(StorageWrapper);
const mockIsMfaDevBuild = jest.mocked(isMfaDevBuild);

describe('devSocialLinkEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMfaDevBuild.mockReturnValue(true);
    mockStorage.getItem.mockResolvedValue(null);
    clearDevSocialLinkEmail();
  });

  it('overrides socialLoginEmail for matching original login in dev builds', () => {
    setDevSocialLinkEmail(' dev-alias@example.com ', 'real@example.com');

    const originalState = {
      authConnection: 'google',
      socialLoginEmail: 'real@example.com',
    };

    expect(applyDevSocialLinkEmail(originalState)).toStrictEqual({
      authConnection: 'google',
      socialLoginEmail: 'dev-alias@example.com',
    });
    expect(originalState.socialLoginEmail).toBe('real@example.com');
  });

  it('does not apply the override to a different social login email', () => {
    setDevSocialLinkEmail('dev-alias@example.com', 'real@example.com');

    const otherState = {
      authConnection: 'google',
      socialLoginEmail: 'other@example.com',
    };

    expect(applyDevSocialLinkEmail(otherState)).toBe(otherState);
  });

  it('is a no-op in non-dev builds', async () => {
    mockIsMfaDevBuild.mockReturnValue(false);

    setDevSocialLinkEmail('dev-alias@example.com', 'real@example.com');
    await hydrateDevSocialLinkEmail();

    const state = { socialLoginEmail: 'real@example.com' };
    expect(applyDevSocialLinkEmail(state)).toBe(state);
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockStorage.getItem).not.toHaveBeenCalled();
  });

  it('hydrates a persisted override from storage in dev builds', async () => {
    mockStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        overrideEmail: 'persisted-alias@example.com',
        originalEmail: 'real@example.com',
      }),
    );

    await hydrateDevSocialLinkEmail();

    expect(
      applyDevSocialLinkEmail({ socialLoginEmail: 'real@example.com' }),
    ).toStrictEqual({
      socialLoginEmail: 'persisted-alias@example.com',
    });
  });

  it('ignores malformed storage entries when hydrating', async () => {
    mockStorage.getItem.mockResolvedValueOnce('{bad-json');

    await expect(hydrateDevSocialLinkEmail()).resolves.toBeUndefined();

    const state = { socialLoginEmail: 'real@example.com' };
    expect(applyDevSocialLinkEmail(state)).toBe(state);
  });
});
