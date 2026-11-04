import { AuthConnection , OAuthLoginResultType } from '../OAuthService/OAuthInterface';
import Engine from '../Engine';
import OAuthLoginService from '../OAuthService/OAuthService';
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
    handleSeedlessAuthenticate: jest.fn(),
  },
}));

/**
 * Preview package is not on EngineContext in CI. Tests mock it on context and
 * cast the same way production unlock code does.
 */
const getMockMfaRecoveryController = () => {
  const controller = (
    Engine.context as unknown as {
      MfaRecoveryController?: {
        authenticateIdentifier: jest.Mock;
      };
    }
  ).MfaRecoveryController;
  if (!controller) {
    throw new Error('Expected MfaRecoveryController mock on Engine.context');
  }
  return controller;
};

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
  const clientId = 'ios-apple-client-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls authenticateIdentifier then OAuthService.handleSeedlessAuthenticate', async () => {
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
    getMockMfaRecoveryController().authenticateIdentifier.mockResolvedValue(
      session,
    );
    (
      OAuthLoginService.handleSeedlessAuthenticate as jest.Mock
    ).mockResolvedValue({
      type: OAuthLoginResultType.SUCCESS,
      existingUser: true,
      accountName: 'a@b.com',
    });

    const result = await authenticateSeedlessViaMfaIdentifier(identifier, {
      expectedSeedlessUserId: 'auth-sub',
      clientId,
    });

    expect(
      getMockMfaRecoveryController().authenticateIdentifier,
    ).toHaveBeenCalledWith(identifier, { requireSeedlessAuthData: true });
    expect(OAuthLoginService.updateLocalState).toHaveBeenCalledWith({
      userId: 'auth-sub',
      accountName: 'a@b.com',
    });
    expect(OAuthLoginService.handleSeedlessAuthenticate).toHaveBeenCalledWith(
      {
        id_token: 'auth-jwt',
        access_token: 'access',
        metadata_access_token: 'metadata',
        refresh_token: 'refresh',
        revoke_token: 'revoke',
        indexes: [],
        endpoints: {},
        account_name: 'a@b.com',
      },
      AuthConnection.Apple,
      clientId,
    );
    expect(OAuthLoginService.handleSeedlessAuthenticate).toHaveBeenCalledTimes(
      1,
    );
    expect(result).toMatchObject({
      type: 'success',
      existingUser: true,
      accountName: 'a@b.com',
    });
    expect(result.session).toBe(session);
  });

  it('does not mark success when seedless authenticate throws', async () => {
    getMockMfaRecoveryController().authenticateIdentifier.mockResolvedValue({
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
    });
    (
      OAuthLoginService.handleSeedlessAuthenticate as jest.Mock
    ).mockRejectedValue(new Error('seedless failed'));

    await expect(
      authenticateSeedlessViaMfaIdentifier(identifier, { clientId }),
    ).rejects.toThrow('seedless failed');

    expect(OAuthLoginService.updateLocalState).toHaveBeenCalledWith({
      userId: 'auth-sub',
      accountName: 'a@b.com',
    });
    expect(OAuthLoginService.updateLocalState).not.toHaveBeenCalledWith(
      expect.objectContaining({ oauthLoginSuccess: true }),
    );
  });

  it('fails when seedlessAuthData is missing', async () => {
    getMockMfaRecoveryController().authenticateIdentifier.mockResolvedValue({
      seedlessAuthData: undefined,
    });

    await expect(
      authenticateSeedlessViaMfaIdentifier(identifier, { clientId }),
    ).rejects.toThrow(
      'MFA recovery: authenticateIdentifier did not return seedlessAuthData',
    );
  });

  it('fails when seedless userId does not match the expected account', async () => {
    getMockMfaRecoveryController().authenticateIdentifier.mockResolvedValue({
      seedlessAuthData: {
        idTokens: ['auth-jwt'],
        accessToken: 'access',
        metadataAccessToken: 'metadata',
        refreshToken: 'refresh',
        revokeToken: 'revoke',
        authConnection: AuthConnection.Apple,
        authConnectionId: 'ios-apple',
        userId: 'other-auth-sub',
      },
    });

    await expect(
      authenticateSeedlessViaMfaIdentifier(identifier, {
        expectedSeedlessUserId: 'auth-sub',
        clientId,
      }),
    ).rejects.toThrow('MFA recovery: signed in with a different account');
  });
});
