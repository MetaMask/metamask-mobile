import {
  AuthenticationRecoveryAuthProvider,
  createCubistSessionTokenProvider,
} from './auth-provider';

jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  default: {
    randomBytes: jest.fn(() => new Uint8Array(32).fill(0xab)),
  },
}));

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
    const provider = createCubistSessionTokenProvider(authProvider);

    await expect(provider.getAuthenticatedProfileId()).resolves.toBe(
      'profile-1',
    );
  });

  it('returns the requestMfaApproval token bound to the Cubist audience with verification', async () => {
    const authProvider = {
      getAuthenticatedProfileId: jest.fn(),
      authorizeRecoveryRequest: jest.fn().mockResolvedValue({
        approval: 'cubist-approval-jwt',
        identifiers: [],
      }),
    };
    const provider = createCubistSessionTokenProvider(authProvider);

    await expect(provider.getAccessToken()).resolves.toBe(
      'cubist-approval-jwt',
    );
    expect(authProvider.authorizeRecoveryRequest).toHaveBeenCalledWith({
      requestHash: `0x${'ab'.repeat(32)}`,
      audiences: ['cubist'],
      requireTwoFactor: true,
    });
  });

  it('propagates approval failures', async () => {
    const authProvider = {
      getAuthenticatedProfileId: jest.fn(),
      authorizeRecoveryRequest: jest
        .fn()
        .mockRejectedValue(new Error('aal2_required')),
    };
    const provider = createCubistSessionTokenProvider(authProvider);

    await expect(provider.getAccessToken()).rejects.toThrow('aal2_required');
  });
});
