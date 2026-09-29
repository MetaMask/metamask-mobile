import {
  AuthRequest,
  exchangeCodeAsync,
  refreshAsync,
} from 'expo-auth-session';
import { connectX, refreshXToken, disconnectX } from './XAuthService';
import { setTokens, getTokens, clearTokens } from './XTokenStorage';
import { XAuthError, XAuthErrorType } from './XAuthError';

jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  exchangeCodeAsync: jest.fn(),
  refreshAsync: jest.fn(),
  ResponseType: { Code: 'code' },
  CodeChallengeMethod: { S256: 'S256' },
}));

jest.mock('./XTokenStorage', () => ({
  setTokens: jest.fn(),
  getTokens: jest.fn(),
  clearTokens: jest.fn(),
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

    const promise = connectX();

    await expect(promise).rejects.toBeInstanceOf(XAuthError);
    await expect(promise).rejects.toMatchObject({
      type: XAuthErrorType.UserCancelled,
    });
  });

  it('throws XAuthError(UserCancelled) when the user denies consent', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'error',
      error: { code: 'access_denied' },
      params: {},
    });

    await expect(connectX()).rejects.toMatchObject({
      type: XAuthErrorType.UserCancelled,
    });
    expect(exchangeCodeAsync).not.toHaveBeenCalled();
  });

  it('includes the auth error code in the TokenExchangeFailed message for other auth errors', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'error',
      error: { code: 'server_error' },
      params: {},
    });

    const promise = connectX();

    await expect(promise).rejects.toMatchObject({
      type: XAuthErrorType.TokenExchangeFailed,
    });
    await expect(promise).rejects.toThrow('server_error');
    expect(exchangeCodeAsync).not.toHaveBeenCalled();
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

describe('refreshXToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes using the stored refresh token and stores the rotated tokens', async () => {
    (getTokens as jest.Mock).mockResolvedValue({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: 1000,
    });
    (refreshAsync as jest.Mock).mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 7200,
      issuedAt: 1735689600,
    });

    const result = await refreshXToken();

    expect(refreshAsync).toHaveBeenCalledWith(
      { clientId: 'test-client-id', refreshToken: 'old-refresh' },
      { tokenEndpoint: 'https://api.x.com/2/oauth2/token' },
    );
    expect(setTokens).toHaveBeenCalledWith({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: 1735689600000 + 7200000,
    });
    expect(result.refreshToken).toBe('new-refresh');
  });

  it('keeps the old refresh token when the response omits a new one', async () => {
    (getTokens as jest.Mock).mockResolvedValue({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: 1000,
    });
    (refreshAsync as jest.Mock).mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: undefined,
      expiresIn: 7200,
      issuedAt: 1735689600,
    });

    const result = await refreshXToken();

    expect(result.refreshToken).toBe('old-refresh');
  });

  it('throws XAuthError(NoStoredTokens) when there is nothing to refresh', async () => {
    (getTokens as jest.Mock).mockResolvedValue(null);

    await expect(refreshXToken()).rejects.toMatchObject({
      type: XAuthErrorType.NoStoredTokens,
    });
    expect(refreshAsync).not.toHaveBeenCalled();
  });

  it('throws XAuthError(TokenExchangeFailed) when refreshAsync rejects', async () => {
    (getTokens as jest.Mock).mockResolvedValue({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: 1000,
    });
    (refreshAsync as jest.Mock).mockRejectedValue(new Error('refresh failed'));

    await expect(refreshXToken()).rejects.toMatchObject({
      type: XAuthErrorType.TokenExchangeFailed,
    });
  });
});

describe('disconnectX', () => {
  it('clears stored tokens', async () => {
    await disconnectX();

    expect(clearTokens).toHaveBeenCalledTimes(1);
  });
});
