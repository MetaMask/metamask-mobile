import { TokenManager } from './tokenManager';
import {
  getCardBaanxToken,
  storeCardBaanxToken,
  removeCardBaanxToken,
} from './cardTokenVault';
import { refreshCardToken } from './refreshCardToken';
import { CardTokenData } from '../types';

jest.mock('./cardTokenVault');
jest.mock('./refreshCardToken');
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const mockGetCardBaanxToken = jest.mocked(getCardBaanxToken);
const mockStoreCardBaanxToken = jest.mocked(storeCardBaanxToken);
const mockRemoveCardBaanxToken = jest.mocked(removeCardBaanxToken);
const mockRefreshCardToken = jest.mocked(refreshCardToken);

describe('TokenManager', () => {
  const FIXED_TIMESTAMP = 1640995200000;
  let tm: TokenManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP);
    tm = new TokenManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const freshTokenData: CardTokenData = {
    accessToken: 'fresh-access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiresAt: FIXED_TIMESTAMP + 30 * 60 * 1000, // 30 min
    refreshTokenExpiresAt: FIXED_TIMESTAMP + 14 * 24 * 60 * 60 * 1000, // 14 days
    location: 'us',
  };

  const expiringTokenData: CardTokenData = {
    accessToken: 'expiring-access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000, // 3 min (within 5 min buffer)
    refreshTokenExpiresAt: FIXED_TIMESTAMP + 14 * 24 * 60 * 60 * 1000,
    location: 'us',
  };

  const expiredRefreshTokenData: CardTokenData = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000,
    refreshTokenExpiresAt: FIXED_TIMESTAMP + 30 * 60 * 1000, // expires within 1h buffer
    location: 'us',
  };

  const onboardingTokenData: CardTokenData = {
    accessToken: 'onboarding-access-token',
    accessTokenExpiresAt: FIXED_TIMESTAMP + 30 * 60 * 1000,
    location: 'international',
  };

  const refreshedTokenResponse = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 3600,
    refreshTokenExpiresIn: 1209600,
    location: 'us' as const,
  };

  describe('getValidAccessToken', () => {
    it('returns access token when it is still fresh', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: freshTokenData,
      });

      const token = await tm.getValidAccessToken();

      expect(token).toBe('fresh-access-token');
      expect(mockRefreshCardToken).not.toHaveBeenCalled();
    });

    it('returns null when no token is stored', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: null,
      });

      const token = await tm.getValidAccessToken();

      expect(token).toBeNull();
    });

    it('returns null when token retrieval fails', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: false,
        tokenData: null,
        error: 'Keychain error',
      });

      const token = await tm.getValidAccessToken();

      expect(token).toBeNull();
    });

    it('refreshes token when access token is expiring soon', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenResponse);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const token = await tm.getValidAccessToken();

      expect(token).toBe('new-access-token');
      expect(mockRefreshCardToken).toHaveBeenCalledWith('refresh-token', 'us');
      expect(mockStoreCardBaanxToken).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpiresAt: 3600,
        refreshTokenExpiresAt: 1209600,
        location: 'us',
      });
    });

    it('returns null and removes token when refresh token is expired', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiredRefreshTokenData,
      });
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      const token = await tm.getValidAccessToken();

      expect(token).toBeNull();
      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
      expect(mockRefreshCardToken).not.toHaveBeenCalled();
    });

    it('returns null for onboarding token when it is expiring', async () => {
      const expiringOnboarding: CardTokenData = {
        ...onboardingTokenData,
        accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringOnboarding,
      });

      const token = await tm.getValidAccessToken();

      expect(token).toBeNull();
      expect(mockRefreshCardToken).not.toHaveBeenCalled();
    });

    it('returns onboarding access token when it is still fresh', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: onboardingTokenData,
      });

      const token = await tm.getValidAccessToken();

      expect(token).toBe('onboarding-access-token');
    });

    it('forces refresh when forceRefresh is true even if token is fresh', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: freshTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenResponse);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const token = await tm.getValidAccessToken(true);

      expect(token).toBe('new-access-token');
      expect(mockRefreshCardToken).toHaveBeenCalled();
    });

    it('returns null and cleans up when refresh call fails', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockRejectedValue(new Error('Network error'));
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      const token = await tm.getValidAccessToken();

      expect(token).toBeNull();
      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
    });

    it('returns null when refreshed token is incomplete (no accessToken)', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue({
        ...refreshedTokenResponse,
        accessToken: null as unknown as string,
      });
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      const token = await tm.getValidAccessToken();

      expect(token).toBeNull();
      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
    });
  });

  describe('mutex (concurrency control)', () => {
    it('reuses the same refresh promise for concurrent calls', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });

      let resolveRefresh: (value: typeof refreshedTokenResponse) => void = () =>
        undefined;
      const refreshPromise = new Promise<typeof refreshedTokenResponse>(
        (resolve) => {
          resolveRefresh = resolve;
        },
      );
      mockRefreshCardToken.mockReturnValue(refreshPromise);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      // Launch 5 concurrent calls
      const results = [
        tm.getValidAccessToken(),
        tm.getValidAccessToken(),
        tm.getValidAccessToken(),
        tm.getValidAccessToken(),
        tm.getValidAccessToken(),
      ];

      // Let microtasks settle so the async bodies execute up to the refresh call
      await new Promise((r) => setImmediate(r));

      // Only one refresh should be in-flight
      expect(mockRefreshCardToken).toHaveBeenCalledTimes(1);

      // Resolve the single refresh
      resolveRefresh(refreshedTokenResponse);

      const tokens = await Promise.all(results);

      // All callers should get the same new token
      expect(tokens).toEqual([
        'new-access-token',
        'new-access-token',
        'new-access-token',
        'new-access-token',
        'new-access-token',
      ]);

      // Only one refresh call was made
      expect(mockRefreshCardToken).toHaveBeenCalledTimes(1);
    });

    it('clears mutex after refresh completes, allowing new refreshes', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenResponse);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      // First call triggers a refresh
      await tm.getValidAccessToken();
      expect(mockRefreshCardToken).toHaveBeenCalledTimes(1);

      // Second call triggers another refresh (mutex was cleared)
      await tm.getValidAccessToken();
      expect(mockRefreshCardToken).toHaveBeenCalledTimes(2);
    });

    it('clears mutex even when refresh fails', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      // First call fails
      mockRefreshCardToken.mockRejectedValueOnce(new Error('fail'));
      await tm.getValidAccessToken();

      // Second call should attempt a new refresh (not reuse the failed one)
      mockRefreshCardToken.mockResolvedValueOnce(refreshedTokenResponse);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const token = await tm.getValidAccessToken();
      expect(token).toBe('new-access-token');
      expect(mockRefreshCardToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkAuthenticationStatus', () => {
    it('returns not authenticated when no tokens exist', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: null,
      });

      const result = await tm.checkAuthenticationStatus();

      expect(result).toEqual({ isAuthenticated: false });
    });

    it('returns authenticated when tokens are fresh', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: freshTokenData,
      });

      const result = await tm.checkAuthenticationStatus();

      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
    });

    it('returns not authenticated and removes tokens when refresh token is expiring within 1 hour', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiredRefreshTokenData,
      });
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      const result = await tm.checkAuthenticationStatus();

      expect(result).toEqual({ isAuthenticated: false });
      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
    });

    it('returns authenticated after proactive refresh when access token is expiring', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenResponse);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const result = await tm.checkAuthenticationStatus();

      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
      expect(mockRefreshCardToken).toHaveBeenCalled();
    });

    it('returns not authenticated when proactive refresh fails', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockRejectedValue(new Error('fail'));
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      const result = await tm.checkAuthenticationStatus();

      expect(result).toEqual({ isAuthenticated: false });
    });

    it('returns authenticated for fresh onboarding token', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: onboardingTokenData,
      });

      const result = await tm.checkAuthenticationStatus();

      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'international',
      });
    });

    it('returns not authenticated when onboarding token is expired', async () => {
      const expiredOnboarding: CardTokenData = {
        ...onboardingTokenData,
        accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000,
      };
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiredOnboarding,
      });
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      const result = await tm.checkAuthenticationStatus();

      expect(result).toEqual({ isAuthenticated: false });
      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
    });

    it('returns not authenticated when token retrieval fails', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: false,
        tokenData: null,
        error: 'Keychain error',
      });

      const result = await tm.checkAuthenticationStatus();

      expect(result).toEqual({ isAuthenticated: false });
    });
  });
});
