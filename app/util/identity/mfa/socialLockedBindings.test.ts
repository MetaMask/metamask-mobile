import Engine from '../../../core/Engine';
import { createSocialLockedMfaControllerAdapter } from './socialLockedBindings';

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      refreshSocialLoginCredentials: jest.fn(),
      beginSocialLoginVerification: jest.fn(),
      completeSocialLoginVerification: jest.fn(),
    },
  },
}));

const auth = {
  refreshSocialLoginCredentials: jest.mocked(
    Engine.context.AuthenticationController.refreshSocialLoginCredentials,
  ),
  beginSocialLoginVerification: jest.mocked(
    Engine.context.AuthenticationController.beginSocialLoginVerification,
  ),
  completeSocialLoginVerification: jest.mocked(
    Engine.context.AuthenticationController.completeSocialLoginVerification,
  ),
};

const mockPasskeyAssertion = {
  id: 'cred-id',
  rawId: 'raw-id',
  type: 'public-key' as const,
  response: {
    authenticatorData: 'auth-data',
    clientDataJSON: 'client-data',
    signature: 'sig',
  },
};

describe('createSocialLockedMfaControllerAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists credentials via refreshSocialLoginCredentials', async () => {
    auth.refreshSocialLoginCredentials.mockResolvedValue([
      { id: '1', type: 'passkey', status: 'active' },
    ]);
    const adapter = createSocialLockedMfaControllerAdapter();

    await expect(adapter.refreshEnrolledCredentials()).resolves.toEqual([
      { id: '1', type: 'passkey', status: 'active' },
    ]);
    expect(auth.refreshSocialLoginCredentials).toHaveBeenCalledTimes(1);
  });

  it('refuses enrollment while locked', async () => {
    const adapter = createSocialLockedMfaControllerAdapter();
    await expect(
      adapter.beginCredentialEnrollment({
        type: 'passkey',
        reason: { operation: 'qa.test' },
      }),
    ).rejects.toThrow(/not available while the social wallet is locked/);

    await expect(
      adapter.completeCredentialEnrollment({
        flowId: 'flow',
        proof: { type: 'passkey', attestation: mockPasskeyAssertion },
        reason: { operation: 'qa.test' },
      } as never),
    ).rejects.toThrow(/not available while the social wallet is locked/);
  });

  it('begins social login verification through Auth', async () => {
    const challenge = {
      flowId: 'flow-1',
      expiresAt: Date.now() + 60_000,
      type: 'passkey' as const,
      publicKey: {} as never,
    };
    auth.beginSocialLoginVerification.mockResolvedValue(challenge);
    const adapter = createSocialLockedMfaControllerAdapter();

    await expect(
      adapter.beginCredentialVerification({
        type: 'passkey',
        reason: { operation: 'qa.test' },
      }),
    ).resolves.toEqual(challenge);
    expect(auth.beginSocialLoginVerification).toHaveBeenCalledTimes(1);
  });

  it('caches the token from completeSocialLoginVerification for getVerificationToken', async () => {
    const token = {
      accessToken: 'aal2',
      obtainedAt: Date.now(),
      expiresIn: 900,
      claims: { sub: 'profile', amr: ['passkey'], exp: 1 },
    };
    auth.completeSocialLoginVerification.mockResolvedValue(token);
    const adapter = createSocialLockedMfaControllerAdapter();

    await expect(
      adapter.completeCredentialVerification({
        flowId: 'flow',
        proof: { type: 'passkey', assertion: mockPasskeyAssertion },
        reason: { operation: 'qa.test' },
      }),
    ).resolves.toBe(token);

    await expect(adapter.getVerificationToken()).resolves.toBe(token);

    await adapter.clearVerificationSession();
    await expect(adapter.getVerificationToken()).resolves.toBeNull();
  });
});
