import { AuthConnection } from '../../OAuthInterface';
import { OAuthError, OAuthErrorType } from '../../error';
import { AndroidGoogleFallbackLoginHandler } from './googleFallback';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { AuthRequest } from 'expo-auth-session';

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  ResponseType: {
    Code: 'code',
  },
  CodeChallengeMethod: {
    S256: 'S256',
  },
}));

const mockPromptAsync = jest.fn();

describe('AndroidGoogleFallbackLoginHandler', () => {
  let handler: AndroidGoogleFallbackLoginHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AuthRequest constructor to return an object with promptAsync method
    (AuthRequest as jest.Mock).mockImplementation(() => ({
      promptAsync: mockPromptAsync,
      codeVerifier: 'test-code-verifier',
    }));

    handler = new AndroidGoogleFallbackLoginHandler({
      clientId: 'test-client-id',
      redirectUri: 'test://redirect',
      authServerUrl: 'https://test-auth-server.com',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
    });
  });

  describe('login', () => {
    it('returns success result when user completes authentication', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: {
          code: 'test-auth-code',
        },
      });

      const result = await handler.login();

      expect(result).toEqual({
        authConnection: AuthConnection.Google,
        code: 'test-auth-code',
        clientId: 'test-client-id',
        redirectUri: 'test://redirect',
        codeVerifier: 'test-code-verifier',
      });
    });

    it('throws UserCancelled error when user cancels', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'cancel',
      });

      await expect(handler.login()).rejects.toThrow(OAuthError);
      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.UserCancelled,
      });
    });

    it('throws UserDismissed error when user dismisses', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'dismiss',
      });

      await expect(handler.login()).rejects.toThrow(OAuthError);
      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.UserDismissed,
      });
    });

    it('throws GoogleLoginError for unknown result types', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'error',
      });

      await expect(handler.login()).rejects.toThrow(OAuthError);
      await expect(handler.login()).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginError,
      });
    });
  });

  describe('getAuthTokenRequestData', () => {
    it('returns correct auth request params when code is provided', () => {
      const params = {
        authConnection: AuthConnection.Google,
        code: 'test-code',
        clientId: 'test-client-id',
        redirectUri: 'test://redirect',
        codeVerifier: 'test-verifier',
        web3AuthNetwork: Web3AuthNetwork.Mainnet,
      };

      const result = handler.getAuthTokenRequestData(params);

      expect(result).toEqual({
        client_id: 'test-client-id',
        redirect_uri: 'test://redirect',
        code: 'test-code',
        login_provider: AuthConnection.Google,
        network: Web3AuthNetwork.Mainnet,
        code_verifier: 'test-verifier',
      });
    });

    it('throws InvalidGetAuthTokenParams error when code is missing', () => {
      const params = {
        authConnection: AuthConnection.Google,
        idToken: 'test-id-token',
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
      ).toThrow('AndroidGoogleFallbackLoginHandler: Invalid params');
    });
  });
});
