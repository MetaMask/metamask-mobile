import { AuthConnection } from '../../OAuthInterface';
import { OAuthError, OAuthErrorType } from '../../error';
import { AndroidGoogleLoginHandler } from './google';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { signInWithGoogle } from '@metamask/react-native-acm';

jest.mock('@metamask/react-native-acm', () => ({
  signInWithGoogle: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

const mockSignInWithGoogle = signInWithGoogle as jest.Mock;

describe('AndroidGoogleLoginHandler', () => {
  let handler: AndroidGoogleLoginHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    handler = new AndroidGoogleLoginHandler({
      clientId: 'test-client-id',
      authServerUrl: 'https://test-auth-server.com',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
    });
  });

  describe('login', () => {
    it('throws GoogleLoginUserDisabledOneTapFeature when user disabled One Tap', async () => {
      mockSignInWithGoogle.mockRejectedValue(
        new Error('user disabled the feature'),
      );

      await expect(handler.login()).rejects.toThrow(OAuthError);
      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginUserDisabledOneTapFeature,
      });
    });

    it('throws GoogleLoginNoProviderDependencies when provider dependencies not found', async () => {
      mockSignInWithGoogle.mockRejectedValue(
        new Error(
          'e1 error N0.j: getCredentialAsync no provider dependencies found - please ensure the desired provider dependencies are added',
        ),
      );

      await expect(handler.login()).rejects.toThrow(OAuthError);
      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginNoProviderDependencies,
      });
    });
  });

  describe('getAuthTokenRequestData', () => {
    it('returns correct auth request params when idToken is provided', () => {
      const params = {
        authConnection: AuthConnection.Google,
        idToken: 'test-id-token',
        clientId: 'test-client-id',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
      };

      const result = handler.getAuthTokenRequestData(params);

      expect(result).toEqual({
        client_id: 'test-client-id',
        id_token: 'test-id-token',
        login_provider: AuthConnection.Google,
        network: Web3AuthNetwork.Mainnet,
      });
    });

    it('throws InvalidGetAuthTokenParams error when idToken is missing', () => {
      const params = {
        authConnection: AuthConnection.Google,
        code: 'test-code',
        clientId: 'test-client-id',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
      };

      expect(() =>
        handler.getAuthTokenRequestData(
          params as unknown as Parameters<
            typeof handler.getAuthTokenRequestData
          >[0],
        ),
      ).toThrow(OAuthError);
      expect(() =>
        handler.getAuthTokenRequestData(
          params as unknown as Parameters<
            typeof handler.getAuthTokenRequestData
          >[0],
        ),
      ).toThrow('handleAndroidGoogleLogin: Invalid params');
    });
  });

  describe('properties', () => {
    it('has correct authConnection', () => {
      expect(handler.authConnection).toBe(AuthConnection.Google);
    });
  });
});
