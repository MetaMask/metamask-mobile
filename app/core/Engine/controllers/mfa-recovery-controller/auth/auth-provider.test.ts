import {
  AuthenticationRecoveryAuthProvider,
  createCubistSessionTokenProvider,
} from './auth-provider';

describe('AuthenticationRecoveryAuthProvider', () => {
  it('resolves the canonical profile id through AuthenticationController', async () => {
    const call = jest.fn().mockResolvedValue('canonical-profile');
    const provider = new AuthenticationRecoveryAuthProvider({
      messenger: { call } as never,
    });

    await expect(provider.getAuthenticatedProfileId()).resolves.toBe(
      'canonical-profile',
    );
    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:refreshCanonicalProfileId',
    );
  });

  it('requests an MFA approval with verification when two-factor is required', async () => {
    const identifiers = [{ type: 'email' }];
    const call = jest
      .fn()
      .mockResolvedValue({ approval: 'approval-jwt', identifiers });
    const provider = new AuthenticationRecoveryAuthProvider({
      messenger: { call } as never,
    });

    const result = await provider.authorizeRecoveryRequest({
      requestHash: '0x' + 'a'.repeat(64),
      audiences: ['escrow-audience'],
      requireTwoFactor: true,
    });

    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:requestMfaApproval',
      {
        requestHash: '0x' + 'a'.repeat(64),
        audiences: ['escrow-audience'],
        requireVerification: true,
        includeIdentifiers: true,
        reason: { operation: 'mfa_recovery' },
      },
    );
    expect(result).toEqual({ approval: 'approval-jwt', identifiers });
  });

  it('does not require verification and defaults identifiers to empty', async () => {
    const call = jest.fn().mockResolvedValue({ approval: 'approval-jwt' });
    const provider = new AuthenticationRecoveryAuthProvider({
      messenger: { call } as never,
    });

    const result = await provider.authorizeRecoveryRequest({
      requestHash: '0x' + 'b'.repeat(64),
      audiences: ['escrow-audience'],
    });

    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:requestMfaApproval',
      expect.objectContaining({ requireVerification: false }),
    );
    expect(result).toEqual({ approval: 'approval-jwt', identifiers: [] });
  });
});

describe('createCubistSessionTokenProvider', () => {
  it('uses the canonical profile id from the auth provider', async () => {
    const authProvider = {
      getAuthenticatedProfileId: jest.fn().mockResolvedValue('profile-1'),
      authorizeRecoveryRequest: jest.fn(),
    };
    const provider = createCubistSessionTokenProvider(authProvider, jest.fn());

    await expect(provider.getAuthenticatedProfileId()).resolves.toBe(
      'profile-1',
    );
  });

  it('returns the profile bearer token without requesting an MFA approval', async () => {
    const authProvider = {
      getAuthenticatedProfileId: jest.fn(),
      authorizeRecoveryRequest: jest.fn(),
    };
    const getBearerToken = jest.fn().mockResolvedValue('profile-jwt');
    const provider = createCubistSessionTokenProvider(
      authProvider,
      getBearerToken,
    );

    await expect(provider.getAccessToken()).resolves.toBe('profile-jwt');
    expect(authProvider.authorizeRecoveryRequest).not.toHaveBeenCalled();
  });

  it('propagates bearer token failures', async () => {
    const authProvider = {
      getAuthenticatedProfileId: jest.fn(),
      authorizeRecoveryRequest: jest.fn(),
    };
    const provider = createCubistSessionTokenProvider(
      authProvider,
      jest.fn().mockRejectedValue(new Error('not signed in')),
    );

    await expect(provider.getAccessToken()).rejects.toThrow('not signed in');
  });
});
