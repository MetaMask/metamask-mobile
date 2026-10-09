import { Platform } from 'react-native';
import { AuthConnection } from '../OAuthService/OAuthInterface';
import { createLoginHandler } from '../OAuthService/OAuthLoginHandlers';
import { isMoneyMfaEnabled } from '../../lib/Money/feature-flags';
import { createMoneyMfaOidcIdentifierAuthProvider } from './createMoneyMfaOidcIdentifierAuthProvider';
import { computeKeyBoundNonce } from './identifierAuthProvider';
import type { Identifier } from './types';

jest.mock('../../lib/Money/feature-flags', () => ({
  isMoneyMfaEnabled: jest.fn(),
}));

jest.mock('../OAuthService/OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Platform: {
      ...actual.Platform,
      OS: 'ios',
    },
  };
});

const mockedIsMoneyMfaEnabled = jest.mocked(isMoneyMfaEnabled);
const mockCreateLoginHandler = jest.mocked(createLoginHandler);

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

  it('uses the default login handler when loginWithNonce is omitted', async () => {
    mockedIsMoneyMfaEnabled.mockReturnValue(true);
    const expectedNonce = computeKeyBoundNonce(PROOF_PUBLIC_KEY, REQUEST_HASH);
    const idToken = buildIdToken({
      iss: 'https://accounts.google.com',
      sub: 'google-sub-1',
      aud: 'client-id',
      nonce: expectedNonce,
    });
    const login = jest.fn().mockResolvedValue({ idToken });
    mockCreateLoginHandler.mockReturnValue({ login } as never);

    const provider = createMoneyMfaOidcIdentifierAuthProvider({
      getRemoteFeatureFlags: () => ({
        isMoneyMfaEnabled: { enabled: true, minimumVersion: '0.0.0' },
      }),
    });

    const token = await provider.getKeyBoundIdentifierToken({
      identifier: googleIdentifier,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(mockCreateLoginHandler).toHaveBeenCalledWith(
      Platform.OS,
      AuthConnection.Google,
      false,
      { nonce: expectedNonce },
    );
    expect(token.providerAssertion).toBe(idToken);
  });
});
