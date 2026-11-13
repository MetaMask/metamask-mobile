import { AuthRequest, exchangeCodeAsync } from 'expo-auth-session';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { OAuthErrorType } from '../../error';
import { IosGoogleLoginHandler } from './google';

const mockIosConfig = {
  IosGID: 'ios-google-client-id' as string,
  IosGoogleRedirectUri: 'com.metamask://oauth' as string,
};

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  ResponseType: { Code: 'code' },
  CodeChallengeMethod: { S256: 'S256' },
  Prompt: { SelectAccount: 'select_account' },
  exchangeCodeAsync: jest.fn(),
}));

jest.mock('../constants', () => ({
  get IosGID() {
    return mockIosConfig.IosGID;
  },
  get IosGoogleRedirectUri() {
    return mockIosConfig.IosGoogleRedirectUri;
  },
}));

const mockPromptAsync = jest.fn();
const mockExchangeCodeAsync = jest.mocked(exchangeCodeAsync);

describe('IosGoogleLoginHandler', () => {
  let handler: IosGoogleLoginHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIosConfig.IosGID = 'ios-google-client-id';
    mockIosConfig.IosGoogleRedirectUri = 'com.metamask://oauth';
    (AuthRequest as jest.Mock).mockImplementation(() => ({
      promptAsync: mockPromptAsync,
      codeVerifier: 'pkce-verifier',
    }));
    handler = new IosGoogleLoginHandler({
      clientId: 'web-client-id',
      authServerUrl: 'https://auth.example.com',
      web3AuthNetwork: Web3AuthNetwork.Mainnet,
      nonce: 'recovery-nonce',
    });
  });

  describe('getProviderIdToken', () => {
    it('returns the Google ID token from a successful PKCE exchange', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });
      mockExchangeCodeAsync.mockResolvedValue({
        idToken: 'google-id-token',
      } as never);

      const idToken = await handler.getProviderIdToken();

      expect(AuthRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'ios-google-client-id',
          redirectUri: 'com.metamask://oauth',
          extraParams: { nonce: 'recovery-nonce' },
          usePKCE: true,
        }),
      );
      expect(mockPromptAsync).toHaveBeenCalledWith(
        { authorizationEndpoint: handler.OAUTH_SERVER_URL },
        { preferUniversalLinks: true },
      );
      expect(mockExchangeCodeAsync).toHaveBeenCalledWith(
        {
          clientId: 'ios-google-client-id',
          code: 'auth-code',
          redirectUri: 'com.metamask://oauth',
          extraParams: { code_verifier: 'pkce-verifier' },
        },
        { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
      );
      expect(idToken).toBe('google-id-token');
    });

    it('throws UnsupportedPlatform when the iOS Google client is not configured', async () => {
      mockIosConfig.IosGID = '';

      await expect(handler.getProviderIdToken()).rejects.toMatchObject({
        code: OAuthErrorType.UnsupportedPlatform,
      });
      expect(mockPromptAsync).not.toHaveBeenCalled();
    });

    it('throws UserCancelled when the user cancels', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      await expect(handler.getProviderIdToken()).rejects.toMatchObject({
        code: OAuthErrorType.UserCancelled,
      });
    });

    it('throws UserCancelled when the user dismisses', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'dismiss' });

      await expect(handler.getProviderIdToken()).rejects.toMatchObject({
        code: OAuthErrorType.UserCancelled,
      });
    });

    it('throws GoogleLoginError for an unknown auth result', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'error' });

      await expect(handler.getProviderIdToken()).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginError,
      });
    });

    it('throws GoogleLoginError when the token response has no ID token', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });
      mockExchangeCodeAsync.mockResolvedValue({ idToken: undefined } as never);

      await expect(handler.getProviderIdToken()).rejects.toMatchObject({
        code: OAuthErrorType.GoogleLoginError,
      });
    });

    it('uses an empty code verifier when AuthRequest omits one', async () => {
      (AuthRequest as jest.Mock).mockImplementation(() => ({
        promptAsync: mockPromptAsync,
        codeVerifier: undefined,
      }));
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { code: 'auth-code' },
      });
      mockExchangeCodeAsync.mockResolvedValue({
        idToken: 'google-id-token',
      } as never);

      await handler.getProviderIdToken();

      expect(mockExchangeCodeAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          extraParams: { code_verifier: '' },
        }),
        expect.any(Object),
      );
    });
  });
});
