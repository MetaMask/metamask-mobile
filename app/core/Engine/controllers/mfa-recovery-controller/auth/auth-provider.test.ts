import { createCubistSessionTokenProvider } from './auth-provider';

describe('createCubistSessionTokenProvider', () => {
  it('uses the canonical profile id from the getter', async () => {
    const provider = createCubistSessionTokenProvider(
      jest.fn().mockResolvedValue('profile-1'),
      jest.fn(),
    );

    await expect(provider.getAuthenticatedProfileId()).resolves.toBe(
      'profile-1',
    );
  });

  it('returns the profile bearer token', async () => {
    const provider = createCubistSessionTokenProvider(
      jest.fn(),
      jest.fn().mockResolvedValue('profile-jwt'),
    );

    await expect(provider.getAccessToken()).resolves.toBe('profile-jwt');
  });

  it('propagates bearer token failures', async () => {
    const provider = createCubistSessionTokenProvider(
      jest.fn(),
      jest.fn().mockRejectedValue(new Error('not signed in')),
    );

    await expect(provider.getAccessToken()).rejects.toThrow('not signed in');
  });
});
