import { Platform } from 'react-native';
import { bytesToHex, stringToBytes } from '@metamask/utils';
import { sha256 } from '@noble/hashes/sha2';
import { AuthConnection } from '../OAuthService/OAuthInterface';
import { createLoginHandler } from '../OAuthService/OAuthLoginHandlers';
import {
  computeKeyBoundNonce,
  createOidcIdentifierAuthProvider,
  loginWithNonceAndSeedlessAuthViaHandlers,
  loginWithNonceViaHandlers,
  type LoginWithNonce,
  type LoginWithNonceAndSeedlessAuth,
} from './identifierAuthProvider';
import type { Identifier } from './types';

jest.mock('../OAuthService/OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

jest.mock('../OAuthService/OAuthLoginHandlers/constants', () => ({
  AuthServerUrl: 'https://auth.example',
  web3AuthNetwork: 'sapphire_devnet',
  GoogleWebGID: 'mock-google-web-gid',
  SupportedPlatforms: { Android: 'android', IOS: 'ios' },
  AuthConnectionConfig: {
    ios: {
      google: {
        authConnectionId: 'ios-google',
        groupedAuthConnectionId: 'g-google',
      },
      apple: {
        authConnectionId: 'ios-apple',
        groupedAuthConnectionId: 'g-apple',
      },
      telegram: {
        authConnectionId: 'ios-telegram',
        groupedAuthConnectionId: 'g-telegram',
      },
    },
    android: {
      google: {
        authConnectionId: 'android-google',
        groupedAuthConnectionId: 'g-google',
      },
      apple: {
        authConnectionId: 'android-apple',
        groupedAuthConnectionId: 'g-apple',
      },
      telegram: {
        authConnectionId: 'android-telegram',
        groupedAuthConnectionId: 'g-telegram',
      },
    },
  },
}));

jest.mock('../../util/device', () => ({
  __esModule: true,
  default: {
    isAndroid: jest.fn(() => false),
    isIos: jest.fn(() => true),
  },
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

const PROOF_PUBLIC_KEY = new Uint8Array(32).fill(7);
const PROOF_PUBLIC_KEY_HEX = bytesToHex(PROOF_PUBLIC_KEY);
const REQUEST_HASH = `0x${'11'.repeat(32)}`;

const googleIdentifier: Identifier = {
  type: 'social',
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

const authServerResponse = (providerIdToken: string) => ({
  id_token: 'auth-server-jwt',
  provider_id_token: providerIdToken,
  access_token: 'access',
  metadata_access_token: 'metadata',
  refresh_token: 'refresh',
  revoke_token: 'revoke',
  indexes: [],
  endpoints: {},
});

describe('computeKeyBoundNonce', () => {
  it('hashes the canonical [proofPublicKeyHex, requestHash] array', () => {
    const expected = bytesToHex(
      sha256(
        stringToBytes(JSON.stringify([PROOF_PUBLIC_KEY_HEX, REQUEST_HASH])),
      ),
    );

    const nonce = computeKeyBoundNonce(PROOF_PUBLIC_KEY_HEX, REQUEST_HASH);

    expect(nonce).toBe(expected);
    expect(nonce).toMatch(/^0x[0-9a-f]{64}$/u);
  });
});

describe('loginWithNonceAndSeedlessAuthViaHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns provider ID token and seedless auth data from one login', async () => {
    const providerIdToken = tokenFor('0xabc');
    const login = jest.fn().mockResolvedValue({ idToken: providerIdToken });
    const getAuthTokens = jest
      .fn()
      .mockResolvedValue(authServerResponse(providerIdToken));
    const getUserInfo = jest.fn().mockReturnValue({
      userId: 'auth-sub',
      accountName: 'user@example.com',
    });
    mockCreateLoginHandler.mockReturnValue({
      login,
      getAuthTokens,
      getUserInfo,
      // Legacy iOS Google client — maps to iOS auth connection IDs.
      options: { clientId: 'ios-native-google-client' },
    } as never);

    const result = await loginWithNonceAndSeedlessAuthViaHandlers({
      authConnection: AuthConnection.Google,
      nonce: '0xabc',
    });

    expect(mockCreateLoginHandler).toHaveBeenCalledWith(
      Platform.OS,
      AuthConnection.Google,
      Platform.OS === 'android',
      { nonce: '0xabc' },
    );
    expect(getAuthTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        idToken: providerIdToken,
        web3AuthNetwork: 'sapphire_devnet',
      }),
      'https://auth.example',
      'offline',
    );
    expect(result.providerIdToken).toBe(providerIdToken);
    expect(result.seedlessAuthData).toMatchObject({
      idTokens: ['auth-server-jwt'],
      accessToken: 'access',
      metadataAccessToken: 'metadata',
      refreshToken: 'refresh',
      revokeToken: 'revoke',
      authConnection: AuthConnection.Google,
      authConnectionId: 'ios-google',
      groupedAuthConnectionId: 'g-google',
      userId: 'auth-sub',
      socialLoginEmail: 'user@example.com',
    });
  });

  it('maps modern iOS Google (GoogleWebGID) to Android auth connection IDs', async () => {
    const providerIdToken = tokenFor('0xabc');
    mockCreateLoginHandler.mockReturnValue({
      login: jest.fn().mockResolvedValue({ idToken: providerIdToken }),
      getAuthTokens: jest
        .fn()
        .mockResolvedValue(authServerResponse(providerIdToken)),
      getUserInfo: jest.fn().mockReturnValue({
        userId: 'auth-sub',
        accountName: 'user@example.com',
      }),
      options: { clientId: 'mock-google-web-gid' },
    } as never);

    const result = await loginWithNonceAndSeedlessAuthViaHandlers({
      authConnection: AuthConnection.Google,
      nonce: '0xabc',
    });

    expect(result.seedlessAuthData).toMatchObject({
      authConnection: AuthConnection.Google,
      authConnectionId: 'android-google',
      groupedAuthConnectionId: 'g-google',
      userId: 'auth-sub',
    });
  });

  it('fails clearly when the auth-server exchange omits seedless tokens', async () => {
    const login = jest.fn().mockResolvedValue({ idToken: 'raw' });
    const getAuthTokens = jest.fn().mockResolvedValue({
      id_token: 'auth-server-jwt',
      provider_id_token: 'raw',
      access_token: 'access',
      metadata_access_token: 'metadata',
      indexes: [],
      endpoints: {},
    });
    mockCreateLoginHandler.mockReturnValue({
      login,
      getAuthTokens,
      getUserInfo: () => ({ userId: 'u', accountName: '' }),
      options: { clientId: 'ios-apple-client' },
    } as never);

    await expect(
      loginWithNonceAndSeedlessAuthViaHandlers({
        authConnection: AuthConnection.Apple,
        nonce: '0xabc',
      }),
    ).rejects.toThrow('MFA recovery: auth server did not return refresh_token');
  });
});

describe('loginWithNonceViaHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the provider ID token from the shared seedless login', async () => {
    const providerIdToken = 'raw-id-token';
    mockCreateLoginHandler.mockReturnValue({
      login: jest.fn().mockResolvedValue({ idToken: providerIdToken }),
      getAuthTokens: jest
        .fn()
        .mockResolvedValue(authServerResponse(providerIdToken)),
      getUserInfo: jest.fn().mockReturnValue({
        userId: 'auth-sub',
        accountName: 'a@b.com',
      }),
      options: { clientId: 'ios-apple-client' },
    } as never);

    const idToken = await loginWithNonceViaHandlers({
      authConnection: AuthConnection.Apple,
      nonce: '0xabc',
    });

    expect(idToken).toBe(providerIdToken);
  });
});

describe('createOidcIdentifierAuthProvider', () => {
  const expectedNonce = computeKeyBoundNonce(
    PROOF_PUBLIC_KEY_HEX,
    REQUEST_HASH,
  );

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
    expect(token.proofPublicKey).toBe(PROOF_PUBLIC_KEY);
    expect(token.providerAssertion).toBe(tokenFor(expectedNonce));
  });

  it('getKeyBoundIdentifierLogin returns seedlessAuthData and key-bound token from one login', async () => {
    const providerIdToken = tokenFor(expectedNonce);
    const loginWithNonceAndSeedlessAuth: jest.MockedFunction<LoginWithNonceAndSeedlessAuth> =
      jest.fn().mockResolvedValue({
        providerIdToken,
        seedlessAuthData: {
          idTokens: ['auth-jwt'],
          accessToken: 'access',
          metadataAccessToken: 'metadata',
          refreshToken: 'refresh',
          authConnection: AuthConnection.Google,
          authConnectionId: 'ios-google',
          userId: 'auth-sub',
        },
      });
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonceAndSeedlessAuth,
    });

    const login = await provider.getKeyBoundIdentifierLogin?.({
      identifier: googleIdentifier,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(loginWithNonceAndSeedlessAuth).toHaveBeenCalledTimes(1);
    expect(login?.token.providerAssertion).toBe(providerIdToken);
    expect(login?.token.proofPublicKey).toBe(PROOF_PUBLIC_KEY);
    expect(login?.seedlessAuthData).toMatchObject({
      idTokens: ['auth-jwt'],
      accessToken: 'access',
      authConnection: AuthConnection.Google,
      userId: 'auth-sub',
    });
  });

  it('keeps getKeyBoundIdentifierToken working beside getKeyBoundIdentifierLogin', async () => {
    const loginWithNonce: jest.MockedFunction<LoginWithNonce> = jest
      .fn()
      .mockResolvedValue(tokenFor(expectedNonce));
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce,
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: googleIdentifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).resolves.toMatchObject({
      requestHash: REQUEST_HASH,
      providerAssertion: tokenFor(expectedNonce),
    });
    expect(provider.getKeyBoundIdentifierLogin).toEqual(expect.any(Function));
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

  it('rejects when MFA recovery is disabled', async () => {
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => false,
      loginWithNonce: jest.fn(),
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: googleIdentifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toThrow('MFA recovery is disabled');
  });

  it('rejects when the ID token nonce does not match', async () => {
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce: jest.fn().mockResolvedValue(tokenFor('wrong-nonce')),
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: googleIdentifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toThrow(
      'MFA recovery: ID token nonce does not match the request',
    );
  });

  it('discovers provider subject when identifier.value is empty', async () => {
    const loginWithNonce: jest.MockedFunction<LoginWithNonce> = jest
      .fn()
      .mockResolvedValue(tokenFor(expectedNonce));
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce,
    });

    const token = await provider.getKeyBoundIdentifierToken({
      identifier: { ...googleIdentifier, value: '' },
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(token.identifier.value).toBe('google-sub-1');
  });

  it('rejects when a pre-known provider subject does not match the ID token', async () => {
    const provider = createOidcIdentifierAuthProvider({
      isEnabled: () => true,
      loginWithNonce: jest.fn().mockResolvedValue(tokenFor(expectedNonce)),
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: { ...googleIdentifier, value: 'other-google-sub' },
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toThrow('MFA recovery: signed in with a different account');
  });
});
