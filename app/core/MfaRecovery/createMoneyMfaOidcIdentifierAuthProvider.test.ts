import { AuthConnection } from '../OAuthService/OAuthInterface';
import { isMoneyMfaEnabled } from '../../lib/Money/feature-flags';
import { createMoneyMfaOidcIdentifierAuthProvider } from './createMoneyMfaOidcIdentifierAuthProvider';
import type { Identifier } from './types';

jest.mock('../../lib/Money/feature-flags', () => ({
  isMoneyMfaEnabled: jest.fn(),
}));

const mockedIsMoneyMfaEnabled = jest.mocked(isMoneyMfaEnabled);

const PROOF_PUBLIC_KEY = '{"kty":"EC","crv":"P-256","x":"abc","y":"def"}';
const REQUEST_HASH = `0x${'11'.repeat(32)}`;

const googleIdentifier: Identifier = {
  type: 'oidc',
  namespace: 'https://accounts.google.com',
  value: 'google-sub-1',
  verifier: { auds: ['client-id'] },
};

const toBase64Url = (value: string) => Buffer.from(value).toString('base64url');

const buildIdToken = (claims: Record<string, unknown>) =>
  `${toBase64Url('{"alg":"RS256"}')}.${toBase64Url(JSON.stringify(claims))}.signature`;

describe('createMoneyMfaOidcIdentifierAuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes remote flags into isMoneyMfaEnabled and allows login when enabled', async () => {
    mockedIsMoneyMfaEnabled.mockReturnValue(true);
    const remoteFlags = {
      isMoneyMfaEnabled: { enabled: true, minimumVersion: '0.0.0' },
    };
    const loginWithNonce = jest.fn().mockImplementation(async ({ nonce }) =>
      buildIdToken({
        iss: 'https://accounts.google.com',
        sub: 'google-sub-1',
        aud: 'client-id',
        nonce,
      }),
    );

    const provider = createMoneyMfaOidcIdentifierAuthProvider({
      getRemoteFeatureFlags: () => remoteFlags,
      loginWithNonce,
    });

    const token = await provider.getKeyBoundIdentifierToken({
      identifier: googleIdentifier,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(mockedIsMoneyMfaEnabled).toHaveBeenCalledWith(remoteFlags);
    expect(loginWithNonce).toHaveBeenCalledWith({
      authConnection: AuthConnection.Google,
      nonce: expect.stringMatching(/^0x[0-9a-f]{64}$/u),
    });
    expect(token.identifier).toEqual(googleIdentifier);
    expect(typeof token.providerAssertion).toBe('string');
  });

  it('rejects login when isMoneyMfaEnabled returns false', async () => {
    mockedIsMoneyMfaEnabled.mockReturnValue(false);
    const loginWithNonce = jest.fn();

    const provider = createMoneyMfaOidcIdentifierAuthProvider({
      getRemoteFeatureFlags: () => ({
        isMoneyMfaEnabled: { enabled: false, minimumVersion: '0.0.0' },
      }),
      loginWithNonce,
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: googleIdentifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toThrow('MFA recovery is disabled');
    expect(loginWithNonce).not.toHaveBeenCalled();
  });

  it('re-reads remote flags on each getKeyBoundIdentifierToken call', async () => {
    mockedIsMoneyMfaEnabled
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const loginWithNonce = jest.fn().mockImplementation(async ({ nonce }) =>
      buildIdToken({
        iss: 'https://accounts.google.com',
        sub: 'google-sub-1',
        aud: 'client-id',
        nonce,
      }),
    );

    const provider = createMoneyMfaOidcIdentifierAuthProvider({
      getRemoteFeatureFlags: () => ({}),
      loginWithNonce,
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: googleIdentifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toThrow('MFA recovery is disabled');

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: googleIdentifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).resolves.toMatchObject({
      identifier: googleIdentifier,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });
    expect(mockedIsMoneyMfaEnabled).toHaveBeenCalledTimes(2);
  });
});
