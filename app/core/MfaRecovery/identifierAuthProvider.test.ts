import { Platform } from 'react-native';
import { bytesToHex, stringToBytes } from '@metamask/utils';
import { sha256 } from '@noble/hashes/sha2';
import { AuthConnection } from '../OAuthService/OAuthInterface';
import { createLoginHandler } from '../OAuthService/OAuthLoginHandlers';
import {
  computeKeyBoundNonce,
  createOidcIdentifierAuthProvider,
  loginWithNonceViaHandlers,
  type LoginWithNonce,
} from './identifierAuthProvider';
import type { Identifier } from './types';

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

const tokenFor = (nonce: string, overrides: Record<string, unknown> = {}) =>
  buildIdToken({
    iss: 'https://accounts.google.com',
    sub: 'google-sub-1',
    aud: 'client-id',
    nonce,
    ...overrides,
  });

describe('computeKeyBoundNonce', () => {
  it('hashes the canonical [proofPublicKey, requestHash] array', () => {
    const expected = bytesToHex(
      sha256(stringToBytes(JSON.stringify([PROOF_PUBLIC_KEY, REQUEST_HASH]))),
    );

    const nonce = computeKeyBoundNonce(PROOF_PUBLIC_KEY, REQUEST_HASH);

    expect(nonce).toBe(expected);
    expect(nonce).toMatch(/^0x[0-9a-f]{64}$/u);
  });
});

describe('loginWithNonceViaHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the raw ID token from the native login handler', async () => {
    const login = jest.fn().mockResolvedValue({ idToken: 'raw-id-token' });
    mockCreateLoginHandler.mockReturnValue({ login } as never);

    const idToken = await loginWithNonceViaHandlers({
      authConnection: AuthConnection.Apple,
      nonce: '0xabc',
    });

    expect(mockCreateLoginHandler).toHaveBeenCalledWith(
      Platform.OS,
      AuthConnection.Apple,
      false,
      { nonce: '0xabc' },
    );
    expect(idToken).toBe('raw-id-token');
  });

  it('throws when the platform handler omits a raw ID token', async () => {
    const login = jest.fn().mockResolvedValue({ authCode: 'code-only' });
    mockCreateLoginHandler.mockReturnValue({ login } as never);

    await expect(
      loginWithNonceViaHandlers({
        authConnection: AuthConnection.Google,
        nonce: '0xabc',
      }),
    ).rejects.toThrow(
      `MFA recovery: ${AuthConnection.Google} on ${Platform.OS} does not return a raw ID token yet`,
    );
  });
});

describe('createOidcIdentifierAuthProvider', () => {
  const expectedNonce = computeKeyBoundNonce(PROOF_PUBLIC_KEY, REQUEST_HASH);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in with the bound nonce and returns the four-field token', async () => {
    const loginWithNonce: jest.MockedFunction<LoginWithNonce> = jest
      .fn()
      .mockResolvedValue(tokenFor(expectedNonce));
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce,
    });

    const token = await provider.getKeyBoundIdentifierToken({
      identifier: googleIdentifier,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(loginWithNonce).toHaveBeenCalledWith({
      authConnection: AuthConnection.Google,
      nonce: expectedNonce,
    });
    expect(Object.keys(token).sort()).toStrictEqual([
      'identifier',
      'proofPublicKey',
      'providerAssertion',
      'requestHash',
    ]);
    expect(token.providerAssertion).toBe(tokenFor(expectedNonce));
  });

  it('uses loginWithNonceViaHandlers when no login override is provided', async () => {
    const login = jest
      .fn()
      .mockResolvedValue({ idToken: tokenFor(expectedNonce) });
    mockCreateLoginHandler.mockReturnValue({ login } as never);
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
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
    expect(token.providerAssertion).toBe(tokenFor(expectedNonce));
  });

  it('maps the Apple issuer to Apple login', async () => {
    const loginWithNonce: jest.MockedFunction<LoginWithNonce> = jest
      .fn()
      .mockResolvedValue(
        tokenFor(expectedNonce, { iss: 'https://appleid.apple.com' }),
      );
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce,
    });

    await provider.getKeyBoundIdentifierToken({
      identifier: {
        ...googleIdentifier,
        namespace: 'https://appleid.apple.com',
      },
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(loginWithNonce).toHaveBeenCalledWith({
      authConnection: AuthConnection.Apple,
      nonce: expectedNonce,
    });
  });

  it('accepts an OIDC issuer namespace with a trailing slash', async () => {
    const loginWithNonce: jest.MockedFunction<LoginWithNonce> = jest
      .fn()
      .mockResolvedValue(
        tokenFor(expectedNonce, { iss: 'https://accounts.google.com/' }),
      );
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce,
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: {
          ...googleIdentifier,
          namespace: 'https://accounts.google.com/',
        },
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).resolves.toMatchObject({
      identifier: {
        namespace: 'https://accounts.google.com/',
      },
    });
    expect(loginWithNonce).toHaveBeenCalledWith({
      authConnection: AuthConnection.Google,
      nonce: expectedNonce,
    });
  });

  it('throws when the feature flag is off', async () => {
    const loginWithNonce = jest.fn();
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => false,
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

  it.each([
    [
      'passkey identifier',
      { ...googleIdentifier, type: 'passkey' },
      'unsupported identifier type',
    ],
    [
      'unknown issuer',
      { ...googleIdentifier, namespace: 'https://login.example.com' },
      'unsupported OIDC issuer',
    ],
  ])('rejects a %s before logging in', async (_label, identifier, message) => {
    const loginWithNonce = jest.fn();
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce,
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toThrow(message);
    expect(loginWithNonce).not.toHaveBeenCalled();
  });

  it.each([
    ['nonce', { nonce: '0xdeadbeef' }, 'nonce does not match'],
    ['account', { sub: 'someone-else' }, 'different account'],
    ['issuer', { iss: 'https://appleid.apple.com' }, 'issuer does not match'],
  ])(
    'rejects an ID token with the wrong %s',
    async (_label, overrides, message) => {
      const provider = createOidcIdentifierAuthProvider({
        isEnabled: () => true,
        loginWithNonce: jest
          .fn()
          .mockResolvedValue(tokenFor(expectedNonce, overrides)),
      });

      await expect(
        provider.getKeyBoundIdentifierToken({
          identifier: googleIdentifier,
          proofPublicKey: PROOF_PUBLIC_KEY,
          requestHash: REQUEST_HASH,
        }),
      ).rejects.toThrow(message);
    },
  );

  it('rejects a malformed ID token without a payload segment', async () => {
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce: jest.fn().mockResolvedValue('not-a-jwt'),
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: googleIdentifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toThrow('MFA recovery: provider returned a malformed ID token');
  });
});
