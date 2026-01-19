import Logger from '../../../../util/Logger';
import { handleLocalAuthentication } from './handleLocalAuthentication';
import {
  getCardBaanxToken,
  removeCardBaanxToken,
  storeCardBaanxToken,
} from './cardTokenVault';
import { refreshCardToken } from './refreshCardToken';

jest.mock('../../../../util/Logger');
jest.mock('./cardTokenVault');
jest.mock('./refreshCardToken');

const mockLogger = jest.mocked(Logger);
const mockGetCardBaanxToken = jest.mocked(getCardBaanxToken);
const mockRemoveCardBaanxToken = jest.mocked(removeCardBaanxToken);
const mockStoreCardBaanxToken = jest.mocked(storeCardBaanxToken);
const mockRefreshCardToken = jest.mocked(refreshCardToken);

describe('handleLocalAuthentication', () => {
  const FIXED_TIMESTAMP = 1640995200000; // Fixed timestamp

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Baanx login disabled', () => {
    it('returns not authenticated when Baanx login is disabled', async () => {
      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: false,
      });

      expect(result).toEqual({
        isAuthenticated: false,
      });
      expect(mockGetCardBaanxToken).not.toHaveBeenCalled();
    });
  });

  describe('Token retrieval failures', () => {
    it('returns not authenticated when token retrieval fails', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: false,
        tokenData: null,
        error: 'Keychain error',
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(result).toEqual({
        isAuthenticated: false,
      });
    });

    it('returns not authenticated when token data is null', async () => {
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: null,
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(result).toEqual({
        isAuthenticated: false,
      });
    });

    it('returns not authenticated when getCardBaanxToken returns null', async () => {
      mockGetCardBaanxToken.mockResolvedValue(
        null as unknown as Awaited<ReturnType<typeof getCardBaanxToken>>,
      );

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(result).toEqual({
        isAuthenticated: false,
      });
    });
  });

  describe('Refresh token expiration', () => {
    it('removes token and returns not authenticated when refresh token expires within 1 hour', async () => {
      const expiringTokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 30 * 60 * 1000, // 30 minutes
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 30 * 60 * 1000, // Expires in 30 minutes
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
      expect(result).toEqual({
        isAuthenticated: false,
      });
    });

    it('removes token and returns not authenticated when refresh token is already expired', async () => {
      const expiredTokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP - 30 * 60 * 1000,
        refreshTokenExpiresAt: FIXED_TIMESTAMP - 30 * 60 * 1000, // Already expired
        location: 'international' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiredTokenData,
      });
      mockRemoveCardBaanxToken.mockResolvedValue({ success: true });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
      expect(result).toEqual({
        isAuthenticated: false,
      });
    });

    it('refreshes token when refresh token expires exactly at 1 hour threshold and access token is expiring', async () => {
      const tokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000, // 3 minutes remaining (needs refresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 60 * 60 * 1000, // Exactly 1 hour
        location: 'us' as const,
      };

      const refreshedTokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        refreshTokenExpiresIn: 86400,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenData);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRemoveCardBaanxToken).not.toHaveBeenCalled();
      expect(mockRefreshCardToken).toHaveBeenCalled();
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
    });
  });

  describe('Fresh access token (skip refresh)', () => {
    it('skips refresh and returns authenticated when access token has more than 5 minutes remaining', async () => {
      const freshTokenData = {
        accessToken: 'fresh-access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 10 * 60 * 1000, // 10 minutes remaining
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: freshTokenData,
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRefreshCardToken).not.toHaveBeenCalled();
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'handleLocalAuthentication: Access token still fresh, skipping refresh',
      );
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
    });

    it('skips refresh for international location when access token is fresh', async () => {
      const freshTokenData = {
        accessToken: 'fresh-access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 2 * 60 * 60 * 1000, // 2 hours remaining
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'international' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: freshTokenData,
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRefreshCardToken).not.toHaveBeenCalled();
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'international',
      });
    });

    it('skips refresh at exactly 5 minute boundary', async () => {
      const boundaryTokenData = {
        accessToken: 'boundary-access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 5 * 60 * 1000 + 1, // Just over 5 minutes
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: boundaryTokenData,
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRefreshCardToken).not.toHaveBeenCalled();
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
    });
  });

  describe('Successful token refresh', () => {
    it('refreshes token and returns authenticated for US location when access token expires soon', async () => {
      const expiringTokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 4 * 60 * 1000, // 4 minutes remaining (less than 5 min threshold)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000, // Valid for 24 hours
        location: 'us' as const,
      };

      const refreshedTokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        refreshTokenExpiresIn: 86400,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenData);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRefreshCardToken).toHaveBeenCalledWith(
        'old-refresh-token',
        'us',
      );
      expect(mockStoreCardBaanxToken).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpiresAt: 3600,
        refreshTokenExpiresAt: 86400,
        location: 'us',
      });
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
    });

    it('refreshes token and returns authenticated for international location when access token expires soon', async () => {
      const expiringTokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000, // 3 minutes remaining
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'international' as const,
      };

      const refreshedTokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        refreshTokenExpiresIn: 86400,
        location: 'international' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenData);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRefreshCardToken).toHaveBeenCalledWith(
        'old-refresh-token',
        'international',
      );
      expect(mockStoreCardBaanxToken).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpiresAt: 3600,
        refreshTokenExpiresAt: 86400,
        location: 'international',
      });
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'international',
      });
    });
  });

  describe('Token refresh failures', () => {
    it('returns not authenticated when token refresh fails', async () => {
      const expiringTokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000, // 3 minutes remaining (needs refresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockRejectedValue(new Error('Token refresh failed'));

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'handleLocalAuthentication: Token refresh failed:',
        expect.any(Error),
      );
      expect(result).toEqual({
        isAuthenticated: false,
      });
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
    });

    it('returns not authenticated when refreshed token has no accessToken', async () => {
      const expiringTokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 2 * 60 * 1000, // 2 minutes remaining (needs refresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'us' as const,
      };

      const invalidRefreshedToken = {
        accessToken: null as unknown as string,
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        refreshTokenExpiresIn: 86400,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(invalidRefreshedToken);

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'handleLocalAuthentication: Token refresh failed:',
        expect.any(Error),
      );
      expect(result).toEqual({
        isAuthenticated: false,
      });
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
    });

    it('returns not authenticated when refreshed token has no refreshToken', async () => {
      const expiringTokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 1 * 60 * 1000, // 1 minute remaining (needs refresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'international' as const,
      };

      const invalidRefreshedToken = {
        accessToken: 'new-access-token',
        refreshToken: undefined as unknown as string,
        expiresIn: 3600,
        refreshTokenExpiresIn: 86400,
        location: 'international' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(invalidRefreshedToken);

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'handleLocalAuthentication: Token refresh failed:',
        expect.any(Error),
      );
      expect(result).toEqual({
        isAuthenticated: false,
      });
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
    });

    it('returns not authenticated when refreshCardToken returns null', async () => {
      const expiringTokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 4 * 60 * 1000, // 4 minutes remaining (needs refresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(
        null as unknown as Awaited<ReturnType<typeof refreshCardToken>>,
      );

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'handleLocalAuthentication: Token refresh failed:',
        expect.any(Error),
      );
      expect(result).toEqual({
        isAuthenticated: false,
      });
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('returns not authenticated when getCardBaanxToken throws error', async () => {
      mockGetCardBaanxToken.mockRejectedValue(
        new Error('Keychain access denied'),
      );

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'handleLocalAuthentication: Authentication verification failed:',
        expect.any(Error),
      );
      expect(result).toEqual({
        isAuthenticated: false,
      });
    });

    it('returns not authenticated when removeCardBaanxToken throws error', async () => {
      const expiringTokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 30 * 60 * 1000,
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 30 * 60 * 1000,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRemoveCardBaanxToken.mockRejectedValue(new Error('Removal failed'));

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'handleLocalAuthentication: Authentication verification failed:',
        expect.any(Error),
      );
      expect(result).toEqual({
        isAuthenticated: false,
      });
    });

    it('returns not authenticated when storeCardBaanxToken throws error', async () => {
      const expiringTokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000, // 3 minutes remaining (needs refresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'us' as const,
      };

      const refreshedTokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        refreshTokenExpiresIn: 86400,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenData);
      mockStoreCardBaanxToken.mockRejectedValue(new Error('Storage failed'));

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'handleLocalAuthentication: Token refresh failed:',
        expect.any(Error),
      );
      expect(result).toEqual({
        isAuthenticated: false,
      });
    });
  });

  describe('Edge cases', () => {
    it('handles refresh token that expires just over 1 hour from now with expiring access token', async () => {
      const expiringTokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 3 * 60 * 1000, // 3 minutes remaining (needs refresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 61 * 60 * 1000, // 61 minutes
        location: 'us' as const,
      };

      const refreshedTokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        refreshTokenExpiresIn: 86400,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: expiringTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenData);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRemoveCardBaanxToken).not.toHaveBeenCalled();
      expect(mockRefreshCardToken).toHaveBeenCalled();
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
    });

    it('skips refresh when access token has long expiration time', async () => {
      const freshTokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 2 * 60 * 60 * 1000, // 2 hours remaining (fresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 365 * 24 * 60 * 60 * 1000, // 1 year
        location: 'international' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: freshTokenData,
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRefreshCardToken).not.toHaveBeenCalled();
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'international',
      });
    });

    it('refreshes token at exactly 5 minute access token boundary', async () => {
      const boundaryTokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: FIXED_TIMESTAMP + 5 * 60 * 1000, // Exactly 5 minutes (should refresh)
        refreshTokenExpiresAt: FIXED_TIMESTAMP + 24 * 60 * 60 * 1000,
        location: 'us' as const,
      };

      const refreshedTokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        refreshTokenExpiresIn: 86400,
        location: 'us' as const,
      };

      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: boundaryTokenData,
      });
      mockRefreshCardToken.mockResolvedValue(refreshedTokenData);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(mockRefreshCardToken).toHaveBeenCalled();
      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
    });
  });
});
