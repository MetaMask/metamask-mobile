import { Platform } from 'react-native';
import AuthTokenHandler from './AuthTokenHandler';
import { AuthConnection } from './OAuthInterface';
import { createLoginHandler } from './OAuthLoginHandlers';

// Mock createLoginHandler module
jest.mock('./OAuthLoginHandlers', () => ({
  createLoginHandler: jest.fn(),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Platform: {
      ...actual.Platform,
    },
  };
});

const mockPlatform = Platform;

describe('AuthTokenHandler', () => {
  const mockLoginHandler = {
    options: {
      clientId: 'test-client-id',
      authServerUrl: 'https://test-auth-server.com',
      web3AuthNetwork: 'test-network',
    },
  };

  let fetchSpy: jest.SpyInstance;
  const mockCreateLoginHandler = createLoginHandler as jest.Mock;

  beforeEach(() => {
    // Mock createLoginHandler return value
    mockCreateLoginHandler.mockReturnValue(mockLoginHandler);

    // Spy on global fetch
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('refreshJWTToken', () => {
    const mockRefreshToken = 'test-refresh-token';
    const mockConnection = AuthConnection.Google;

    it('successfully refreshes JWT token with valid parameters', async () => {
      // Arrange
      const mockResponse = {
        id_token: 'new-id-token',
        access_token: 'new-access-token',
        metadata_access_token: 'new-metadata-access-token',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.refreshJWTToken({
        connection: mockConnection,
        refreshToken: mockRefreshToken,
      });

      // Assert
      expect(mockCreateLoginHandler).toHaveBeenCalledWith(
        Platform.OS,
        mockConnection,
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test-auth-server.com/api/v1/oauth/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: 'test-client-id',
            login_provider: mockConnection,
            network: 'test-network',
            refresh_token: mockRefreshToken,
            grant_type: 'refresh_token',
          }),
        },
      );
      expect(result).toEqual({
        idTokens: ['new-id-token'],
        accessToken: 'new-access-token',
        metadataAccessToken: 'new-metadata-access-token',
      });
    });

    it('handles Apple connection type correctly', async () => {
      // Arrange
      const mockResponse = {
        id_token: 'apple-id-token',
        access_token: 'apple-access-token',
        metadata_access_token: 'apple-metadata-access-token',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Apple,
        refreshToken: mockRefreshToken,
      });

      // Assert
      expect(mockCreateLoginHandler).toHaveBeenCalledWith(
        Platform.OS,
        AuthConnection.Apple,
      );
      expect(result.idTokens).toEqual(['apple-id-token']);
    });

    it('throws error when fetch request fails', async () => {
      // Arrange
      const mockError = new Error('Network error');
      fetchSpy.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: mockConnection,
          refreshToken: mockRefreshToken,
        }),
      ).rejects.toThrow('Network error');
    });

    it('throws error when response is not ok', async () => {
      // Arrange
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: mockConnection,
          refreshToken: mockRefreshToken,
        }),
      ).rejects.toThrow();
    });

    it('handles missing id_token in response', async () => {
      // Arrange
      const mockResponse = {
        access_token: 'new-access-token',
        metadata_access_token: 'new-metadata-access-token',
        // id_token is missing
      };

      fetchSpy.mockResolvedValueOnce({
        ok: jest.fn().mockResolvedValueOnce(true),
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.refreshJWTToken({
        connection: mockConnection,
        refreshToken: mockRefreshToken,
      });

      // Assert
      expect(result.idTokens).toEqual([undefined]);
    });
  });

  describe('revokeRefreshToken', () => {
    const mockRevokeToken = 'test-revoke-token';
    const mockConnection = AuthConnection.Google;

    it('successfully revokes refresh token with valid parameters', async () => {
      // Arrange
      const mockResponse = {
        refresh_token: 'new-refresh-token',
        revoke_token: 'new-revoke-token',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: jest.fn().mockResolvedValueOnce(true),
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.revokeRefreshToken({
        connection: mockConnection,
        revokeToken: mockRevokeToken,
      });

      // Assert
      expect(mockCreateLoginHandler).toHaveBeenCalledWith(
        Platform.OS,
        mockConnection,
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test-auth-server.com/api/v1/oauth/revoke',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            revoke_token: mockRevokeToken,
          }),
        },
      );
      expect(result).toEqual({
        newRefreshToken: 'new-refresh-token',
        newRevokeToken: 'new-revoke-token',
      });
    });

    it('handles Apple connection type correctly', async () => {
      // Arrange
      const mockResponse = {
        refresh_token: 'apple-refresh-token',
        revoke_token: 'apple-revoke-token',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.revokeRefreshToken({
        connection: AuthConnection.Apple,
        revokeToken: mockRevokeToken,
      });

      // Assert
      expect(mockCreateLoginHandler).toHaveBeenCalledWith(
        Platform.OS,
        AuthConnection.Apple,
      );
      expect(result.newRefreshToken).toBe('apple-refresh-token');
    });

    it('throws error when fetch request fails', async () => {
      // Arrange
      const mockError = new Error('Network error');
      fetchSpy.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(
        AuthTokenHandler.revokeRefreshToken({
          connection: mockConnection,
          revokeToken: mockRevokeToken,
        }),
      ).rejects.toThrow('Network error');
    });

    it('throws error when response is not ok', async () => {
      // Arrange
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.revokeRefreshToken({
          connection: mockConnection,
          revokeToken: mockRevokeToken,
        }),
      ).rejects.toThrow();
    });

    it('handles missing tokens in response', async () => {
      // Arrange
      const mockResponse = {
        // Both tokens are missing
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.revokeRefreshToken({
        connection: mockConnection,
        revokeToken: mockRevokeToken,
      });

      // Assert
      expect(result).toEqual({
        newRefreshToken: undefined,
        newRevokeToken: undefined,
      });
    });
  });

  describe('error handling', () => {
    it('handles JSON parsing errors in refreshJWTToken', async () => {
      // Arrange
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: AuthConnection.Google,
          refreshToken: 'test-token',
        }),
      ).rejects.toThrow('Invalid JSON');
    });

    it('handles JSON parsing errors in revokeRefreshToken', async () => {
      // Arrange
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.revokeRefreshToken({
          connection: AuthConnection.Google,
          revokeToken: 'test-token',
        }),
      ).rejects.toThrow('Invalid JSON');
    });
  });

  describe('platform compatibility', () => {
    it('works with different platform values', async () => {
      // Arrange

      mockPlatform.OS = 'android';

      const mockResponse = {
        id_token: 'android-id-token',
        access_token: 'android-access-token',
        metadata_access_token: 'android-metadata-access-token',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      mockCreateLoginHandler.mockClear();

      // Act
      const result = await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Google,
        refreshToken: 'test-token',
      });

      // Assert
      expect(mockCreateLoginHandler).toHaveBeenCalledWith(
        'android',
        AuthConnection.Google,
      );
      expect(result.idTokens).toEqual(['android-id-token']);
    });
  });

  describe('createLoginHandler integration', () => {
    it('calls createLoginHandler with correct parameters for each connection type', async () => {
      // Arrange
      const mockResponse = {
        id_token: 'test-token',
        access_token: 'test-access',
        metadata_access_token: 'test-metadata',
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      mockCreateLoginHandler.mockClear();
      // Act
      await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Google,
        refreshToken: 'test-token',
      });

      await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Apple,
        refreshToken: 'test-token',
      });

      // Assert
      expect(mockCreateLoginHandler).toHaveBeenCalledTimes(2);
      expect(mockCreateLoginHandler).toHaveBeenNthCalledWith(
        1,
        Platform.OS,
        AuthConnection.Google,
      );
      expect(mockCreateLoginHandler).toHaveBeenNthCalledWith(
        2,
        Platform.OS,
        AuthConnection.Apple,
      );
    });
  });
});
