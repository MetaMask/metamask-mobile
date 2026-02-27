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
    it('returns success result when user completes authentication', async () => {
      mockSignInWithGoogle.mockResolvedValue({
        type: 'google-signin',
        idToken: 'test-id-token',
      });

      const result = await handler.login();

      expect(result).toEqual({
        authConnection: AuthConnection.Google,
        idToken: 'test-id-token',
        clientId: 'test-client-id',
      });
    });

    it('throws UserCancelled error when user cancels', async () => {
      mockSignInWithGoogle.mockRejectedValue(
        new Error('User cancelled the login'),
      );

      await expect(handler.login()).rejects.toThrow(OAuthError);
      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.UserCancelled,
      });
    });

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

    it('throws GoogleLoginNoCredential when no credential available after retry', async () => {
      mockSignInWithGoogle
        .mockRejectedValueOnce(new Error('no credential available'))
        .mockRejectedValueOnce(new Error('no credential available'));

      const loginPromise = handler.login();

      await expect(loginPromise).rejects.toThrow(OAuthError);
      await expect(loginPromise).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginNoCredential,
      });
    });

    it('retries once when no credential error occurs', async () => {
      mockSignInWithGoogle
        .mockRejectedValueOnce(new Error('no credential available'))
        .mockResolvedValueOnce({
          type: 'google-signin',
          idToken: 'test-id-token',
        });

      const result = await handler.login();

      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        authConnection: AuthConnection.Google,
        idToken: 'test-id-token',
        clientId: 'test-client-id',
      });
    });

    it('throws GoogleLoginNoMatchingCredential when no matching credential after retry', async () => {
      mockSignInWithGoogle
        .mockRejectedValueOnce(new Error('Cannot find matching credential'))
        .mockRejectedValueOnce(new Error('Cannot find matching credential'));

      const loginPromise = handler.login();

      await expect(loginPromise).rejects.toThrow(OAuthError);
      await expect(loginPromise).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginNoMatchingCredential,
      });
    });

    it('throws GoogleLoginOneTapFailure when One Tap fails after retry', async () => {
      mockSignInWithGoogle
        .mockRejectedValueOnce(
          new Error('failure response from one tap: something went wrong'),
        )
        .mockRejectedValueOnce(
          new Error('failure response from one tap: something went wrong'),
        );

      const loginPromise = handler.login();

      await expect(loginPromise).rejects.toThrow(OAuthError);
      await expect(loginPromise).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginOneTapFailure,
      });
    });

    it('throws UnknownError for unrecognized errors', async () => {
      mockSignInWithGoogle.mockRejectedValue(
        new Error('Some unknown error occurred'),
      );

      await expect(handler.login()).rejects.toThrow(OAuthError);
      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.UnknownError,
      });
    });

    it('throws UnknownError when result type is not google-signin', async () => {
      mockSignInWithGoogle.mockResolvedValue({
        type: 'other-type',
      });

      await expect(handler.login()).rejects.toThrow(OAuthError);
      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.UnknownError,
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

    it('has correct scope', () => {
      expect(handler.scope).toEqual(['email', 'profile', 'openid']);
    });

    it('has correct authServerPath', () => {
      expect(handler.authServerPath).toBe('api/v1/oauth/id_token');
    });
  });
});
