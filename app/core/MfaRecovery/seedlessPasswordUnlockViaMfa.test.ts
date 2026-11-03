import { AuthConnection } from '../OAuthService/OAuthInterface';
import Engine from '../Engine';
import {
  authenticateSeedlessViaMfaIdentifier,
  buildOidcIdentifier,
} from './seedlessPasswordUnlockViaMfa';

jest.mock('../Engine', () => ({
  context: {
    MfaRecoveryController: {
      authenticateIdentifier: jest.fn(),
    },
    SeedlessOnboardingController: {
      authenticate: jest.fn(),
    },
  },
}));

jest.mock('../OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    updateLocalState: jest.fn(),
  },
}));

jest.mock('../../store', () => ({
  store: { dispatch: jest.fn() },
}));

jest.mock('../../actions/onboarding', () => ({
  setSeedlessOnboarding: jest.fn((payload) => ({
    type: 'SET_SEEDLESS_ONBOARDING',
    payload,
  })),
}));

describe('buildOidcIdentifier', () => {
  it('maps auth connection to OIDC issuer namespace', () => {
    expect(
      buildOidcIdentifier({
        authConnection: AuthConnection.Google,
        providerSubject: 'google-sub-1',
      }),
    ).toEqual({
      type: 'social',
      namespace: 'https://accounts.google.com',
      value: 'google-sub-1',
      verifier: null,
    });
  });

  it('allows empty provider subject for rehydration discovery', () => {
    expect(
      buildOidcIdentifier({
        authConnection: AuthConnection.Google,
      }),
    ).toEqual({
      type: 'social',
      namespace: 'https://accounts.google.com',
      value: '',
      verifier: null,
    });
  });
});

describe('authenticateSeedlessViaMfaIdentifier', () => {
  const identifier = buildOidcIdentifier({
    authConnection: AuthConnection.Apple,
    providerSubject: 'apple-sub-1',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls authenticateIdentifier then seedless authenticate without a second OAuth start', async () => {
    const session = {
      seedlessAuthData: {
        idTokens: ['auth-jwt'],
        accessToken: 'access',
        metadataAccessToken: 'metadata',
        refreshToken: 'refresh',
        revokeToken: 'revoke',
        authConnection: AuthConnection.Apple,
        authConnectionId: 'ios-apple',
        userId: 'auth-sub',
        socialLoginEmail: 'a@b.com',
      },
      token: {},
      proofPrivateKey: new Uint8Array(32),
      requestId: 'req',
      ephemeralPrivateKey: new Uint8Array(32),
      pkE: new Uint8Array(32),
    };
    (
      Engine.context.MfaRecoveryController.authenticateIdentifier as jest.Mock
    ).mockResolvedValue(session);
    (
      Engine.context.SeedlessOnboardingController.authenticate as jest.Mock
    ).mockResolvedValue({ isNewUser: false });

    const result = await authenticateSeedlessViaMfaIdentifier(identifier, {
      expectedSeedlessUserId: 'auth-sub',
    });

    expect(
      Engine.context.MfaRecoveryController.authenticateIdentifier,
    ).toHaveBeenCalledWith(identifier, { requireSeedlessAuthData: true });
    expect(
      Engine.context.SeedlessOnboardingController.authenticate,
    ).toHaveBeenCalledWith({
      idTokens: ['auth-jwt'],
      accessToken: 'access',
      metadataAccessToken: 'metadata',
      refreshToken: 'refresh',
      revokeToken: 'revoke',
      authConnection: AuthConnection.Apple,
      authConnectionId: 'ios-apple',
      userId: 'auth-sub',
      socialLoginEmail: 'a@b.com',
    });
    expect(
      Engine.context.SeedlessOnboardingController.authenticate,
    ).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      type: 'success',
      existingUser: true,
      accountName: 'a@b.com',
    });
    expect(result.session).toBe(session);
  });

  it('fails when seedlessAuthData is missing', async () => {
    (
      Engine.context.MfaRecoveryController.authenticateIdentifier as jest.Mock
    ).mockResolvedValue({ seedlessAuthData: undefined });

    await expect(
      authenticateSeedlessViaMfaIdentifier(identifier),
    ).rejects.toThrow(
      'MFA recovery: authenticateIdentifier did not return seedlessAuthData',
    );
  });

  it('fails when seedless userId does not match the expected account', async () => {
    (
      Engine.context.MfaRecoveryController.authenticateIdentifier as jest.Mock
    ).mockResolvedValue({
      seedlessAuthData: {
        idTokens: ['auth-jwt'],
        accessToken: 'access',
        metadataAccessToken: 'metadata',
        refreshToken: 'refresh',
        authConnection: AuthConnection.Apple,
        authConnectionId: 'ios-apple',
        userId: 'other-auth-sub',
      },
    });

    await expect(
      authenticateSeedlessViaMfaIdentifier(identifier, {
        expectedSeedlessUserId: 'auth-sub',
      }),
    ).rejects.toThrow('MFA recovery: signed in with a different account');
  });
});
