import { Platform } from 'react-native';
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

  describe('legacy flow', () => {
    const originalVersion = Platform.Version;

    beforeEach(() => {
      Object.defineProperty(Platform, 'Version', {
        value: 27,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'Version', {
        value: originalVersion,
        writable: true,
        configurable: true,
      });
    });

    it('treats "no credential" as UserCancelled on API < 28', async () => {
      mockSignInWithGoogle.mockRejectedValue(
        new Error('Legacy sign-in returned no credential'),
      );

      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.UserCancelled,
      });
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('does not retry on "no credential" error on API < 28', async () => {
      mockSignInWithGoogle.mockRejectedValue(
        new Error('Legacy sign-in returned no credential'),
      );

      try {
        await handler.login();
      } catch {
        // expected
      }

      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('still handles explicit cancel on API < 28', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('User cancelled'));

      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.UserCancelled,
      });
    });
  });

  describe('ACM flow', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'Version', {
        value: 34,
        writable: true,
        configurable: true,
      });
    });

    it('retries on "no credential" error on API >= 28', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce(
        new Error('e1 error Mo.m: No credential available'),
      );
      mockSignInWithGoogle.mockResolvedValueOnce({
        type: 'google-signin',
        idToken: 'test-id-token',
      });

      const result = await handler.login();

      expect(result.idToken).toBe('test-id-token');
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2);
    });

    it('throws GoogleLoginNoCredential after retry exhausted on API >= 28', async () => {
      mockSignInWithGoogle.mockRejectedValue(
        new Error('e1 error Mo.m: No credential available'),
      );

      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginNoCredential,
      });
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2);
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
