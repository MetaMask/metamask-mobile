import { AuthRequest, exchangeCodeAsync } from 'expo-auth-session';
import { connectX } from './XAuthService';
import { setTokens } from './XTokenStorage';
import { XAuthError, XAuthErrorType } from './XAuthError';

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  exchangeCodeAsync: jest.fn(),
  ResponseType: { Code: 'code' },
  CodeChallengeMethod: { S256: 'S256' },
}));

jest.mock('./XTokenStorage', () => ({
  setTokens: jest.fn(),
}));

jest.mock('./XAuthConfig', () => ({
  X_AUTHORIZATION_ENDPOINT: 'https://x.com/i/oauth2/authorize',
  X_TOKEN_ENDPOINT: 'https://api.x.com/2/oauth2/token',
  X_REDIRECT_URI: 'metamask://x-oauth',
  X_OAUTH_SCOPES: ['users.read', 'tweet.read', 'offline.access'],
  getXClientId: jest.fn(() => 'test-client-id'),
}));

const mockPromptAsync = jest.fn();

describe('connectX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthRequest as unknown as jest.Mock).mockImplementation(() => ({
      promptAsync: mockPromptAsync,
      codeVerifier: 'test-code-verifier',
    }));
  });

  it('exchanges the auth code for tokens and stores them on success', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'test-auth-code', state: 'test-state' },
    });
    (exchangeCodeAsync as jest.Mock).mockResolvedValue({
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresIn: 7200,
      issuedAt: 1735689600,
    });

    const result = await connectX();

    expect(AuthRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'test-client-id',
        redirectUri: 'metamask://x-oauth',
        scopes: ['users.read', 'tweet.read', 'offline.access'],
        responseType: 'code',
        codeChallengeMethod: 'S256',
        usePKCE: true,
      }),
    );
    expect(exchangeCodeAsync).toHaveBeenCalledWith(
      {
        clientId: 'test-client-id',
        code: 'test-auth-code',
        redirectUri: 'metamask://x-oauth',
        extraParams: { code_verifier: 'test-code-verifier' },
      },
      { tokenEndpoint: 'https://api.x.com/2/oauth2/token' },
    );
    expect(setTokens).toHaveBeenCalledWith({
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresAt: 1735689600000 + 7200000,
    });
    expect(result).toEqual({
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresAt: 1735689600000 + 7200000,
    });
  });

  it('throws XAuthError(UserCancelled) when the user cancels', async () => {
    mockPromptAsync.mockResolvedValue({ type: 'cancel' });

    await expect(connectX()).rejects.toMatchObject({
      type: XAuthErrorType.UserCancelled,
    });
    expect(exchangeCodeAsync).not.toHaveBeenCalled();
  });

  it('throws XAuthError(UserCancelled) when the user dismisses the browser', async () => {
    mockPromptAsync.mockResolvedValue({ type: 'dismiss' });

    await expect(connectX()).rejects.toBeInstanceOf(XAuthError);
    await expect(connectX()).rejects.toMatchObject({
      type: XAuthErrorType.UserCancelled,
    });
  });

  it('throws XAuthError(StateMismatch) when the returned state does not match the sent state', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'error',
      error: { code: 'state_mismatch' },
      params: {},
    });

    await expect(connectX()).rejects.toMatchObject({
      type: XAuthErrorType.StateMismatch,
    });
    expect(exchangeCodeAsync).not.toHaveBeenCalled();
  });

  it('throws XAuthError(TokenExchangeFailed) when exchangeCodeAsync rejects', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'test-auth-code' },
    });
    (exchangeCodeAsync as jest.Mock).mockRejectedValue(
      new Error('token endpoint returned 400'),
    );

    await expect(connectX()).rejects.toMatchObject({
      type: XAuthErrorType.TokenExchangeFailed,
    });
    expect(setTokens).not.toHaveBeenCalled();
  });

  it('throws XAuthError(NetworkFailure) when promptAsync rejects with a network error', async () => {
    mockPromptAsync.mockRejectedValue(new TypeError('Network request failed'));

    await expect(connectX()).rejects.toMatchObject({
      type: XAuthErrorType.NetworkFailure,
    });
  });
});
