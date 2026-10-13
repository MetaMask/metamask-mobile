import type { RecoveryAuthProvider } from '@metamask/mfa-recovery-controller';
import { LazyCubistEscrowProvider } from './cubist-escrow-provider';
import type { CubistConfig } from './config';
import { MFA_CONFIG } from './mfa-config';

const fetchMock = jest.fn();

jest.mock('@cubist-labs/cubesigner-sdk', () => ({
  CubeSignerClient: {
    createOidcSession: jest.fn(),
    create: jest.fn(),
  },
  envs: { gamma: { name: 'gamma' } },
}));

jest.mock('@metamask/mfa-recovery-controller', () => ({
  CubistEscrowProvider: jest.fn(() => ({
    isAvailable: jest.fn().mockResolvedValue(true),
    generateChallenge: jest.fn(),
    getSecret: jest.fn(),
    applyMutation: jest.fn(),
    verifyReceipt: jest.fn(),
  })),
}));

global.fetch = fetchMock as unknown as typeof fetch;

const config: CubistConfig = {
  environment: 'gamma',
  orgId: 'org-1',
  wrapPublicKey: '{"kty":"EC","crv":"P-256"}',
  receiptPublicKey: '{"kty":"EC","crv":"P-256"}',
  scopes: ['manage:*'],
  registrationUrl: 'https://recovery-registration.test',
  mpcApiKey: 'api-key',
};

const authProvider: RecoveryAuthProvider & {
  getAccessToken: () => Promise<string>;
} = {
  getAuthenticatedProfileId: jest.fn().mockResolvedValue('profile-1'),
  authorizeRecoveryRequest: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue('mpc-token'),
};

describe('LazyCubistEscrowProvider', () => {
  const mockCubistEscrowProvider = jest.mocked(
    (
      jest.requireMock('@metamask/mfa-recovery-controller') as {
        CubistEscrowProvider: jest.Mock;
      }
    ).CubistEscrowProvider,
  );
  const cubeSignerClient = jest.requireMock('@cubist-labs/cubesigner-sdk')
    .CubeSignerClient as {
    createOidcSession: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        idToken: 'oidc-token',
        expiresAt: Math.floor(Date.now() / 1000) + 300,
      }),
    });
    cubeSignerClient.createOidcSession.mockResolvedValue({
      data: () => ({ token: 'session-token' }),
    });
    cubeSignerClient.create.mockResolvedValue({ client: true });
  });

  it('exposes the selected MFA config wrap key before creating a session', () => {
    const provider = new LazyCubistEscrowProvider({
      authProvider,
      getConfig: () => config,
      isEnabled: () => true,
    });

    expect(provider.wrapPublicKey).toBe(MFA_CONFIG.dev.wrapPublicKey);
  });

  it('creates and caches the authenticated Cubist provider lazily', async () => {
    const provider = new LazyCubistEscrowProvider({
      authProvider,
      getConfig: () => config,
      isEnabled: () => true,
    });

    await expect(provider.isAvailable()).resolves.toBe(true);
    await expect(provider.isAvailable()).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cubeSignerClient.createOidcSession).toHaveBeenCalledWith(
      { name: 'gamma' },
      'org-1',
      'oidc-token',
      ['manage:*'],
    );
    expect(mockCubistEscrowProvider).toHaveBeenCalledWith({
      client: { client: true },
      wrapPublicKey: config.wrapPublicKey,
      receiptPublicKey: config.receiptPublicKey,
    });
  });

  it('does not contact recovery services when disabled', async () => {
    const provider = new LazyCubistEscrowProvider({
      authProvider,
      getConfig: () => config,
      isEnabled: () => false,
    });

    await expect(provider.isAvailable()).rejects.toMatchObject({
      code: 'feature_disabled',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cubeSignerClient.createOidcSession).not.toHaveBeenCalled();
  });

  it('refreshes the provider when the authenticated profile changes', async () => {
    const getAuthenticatedProfileId = jest
      .mocked(authProvider.getAuthenticatedProfileId)
      .mockResolvedValueOnce('profile-1')
      .mockResolvedValueOnce('profile-2');
    const provider = new LazyCubistEscrowProvider({
      authProvider,
      getConfig: () => config,
      isEnabled: () => true,
    });

    await provider.isAvailable();
    await provider.isAvailable();

    expect(getAuthenticatedProfileId).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
