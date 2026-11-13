import {
  createCubistSessionTokenProvider,
  type SocialProfileSession,
} from './session-token-provider';

const SESSION: SocialProfileSession = {
  token: { accessToken: 'social-access', expiresIn: 300, obtainedAt: 1_000 },
  profile: { canonicalProfileId: 'profile-1' },
};

describe('createCubistSessionTokenProvider', () => {
  it('uses the exchanged social session while the wallet is locked', async () => {
    const exchangeSocialAccessToken = jest.fn(async () => SESSION);
    const provider = createCubistSessionTokenProvider({
      isUnlocked: () => false,
      refreshCanonicalProfileId: jest.fn(),
      getBearerToken: jest.fn(),
      exchangeSocialAccessToken,
      now: () => 1_000,
    });

    const profileId = await provider.getAuthenticatedProfileId();
    const accessToken = await provider.getAccessToken();

    expect(profileId).toBe('profile-1');
    expect(accessToken).toBe('social-access');
    expect(exchangeSocialAccessToken).toHaveBeenCalledTimes(1);
  });

  it('uses the SRP session while the wallet is unlocked', async () => {
    const exchangeSocialAccessToken = jest.fn();
    const provider = createCubistSessionTokenProvider({
      isUnlocked: () => true,
      refreshCanonicalProfileId: jest.fn(async () => 'srp-profile'),
      getBearerToken: jest.fn(async () => 'srp-token'),
      exchangeSocialAccessToken,
    });

    const profileId = await provider.getAuthenticatedProfileId();
    const accessToken = await provider.getAccessToken();

    expect(profileId).toBe('srp-profile');
    expect(accessToken).toBe('srp-token');
    expect(exchangeSocialAccessToken).not.toHaveBeenCalled();
  });

  it('exchanges again once the locked session is near expiry', async () => {
    const exchangeSocialAccessToken = jest
      .fn<Promise<SocialProfileSession>, []>()
      .mockResolvedValueOnce(SESSION)
      .mockResolvedValueOnce({
        ...SESSION,
        token: { ...SESSION.token, accessToken: 'refreshed' },
      });
    let now = 1_000;
    const provider = createCubistSessionTokenProvider({
      isUnlocked: () => false,
      refreshCanonicalProfileId: jest.fn(),
      getBearerToken: jest.fn(),
      exchangeSocialAccessToken,
      now: () => now,
    });

    await provider.getAccessToken();
    now = 1_000 + 300 * 1000;
    const accessToken = await provider.getAccessToken();

    expect(accessToken).toBe('refreshed');
    expect(exchangeSocialAccessToken).toHaveBeenCalledTimes(2);
  });
});
