import { Platform } from 'react-native';
import AuthTokenHandler, {
  AUTH_SERVER_RENEW_PATH,
  AUTH_SERVER_REVOKE_PATH,
  AUTH_SERVER_TOKEN_PATH,
} from './AuthTokenHandler';
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

const mockServerUrl = 'https://test-auth-server.com';

describe('AuthTokenHandler', () => {
  const mockLoginHandler = {
    options: {
      clientId: 'test-client-id',
      authServerUrl: mockServerUrl,
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
        `${mockServerUrl}${AUTH_SERVER_TOKEN_PATH}`,
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

    it('throws error when id_token is missing in response', async () => {
      // Arrange
      const mockResponse = {
        access_token: 'new-access-token',
        metadata_access_token: 'new-metadata-access-token',
        // id_token is missing
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: mockConnection,
          refreshToken: mockRefreshToken,
        }),
      ).rejects.toThrow('Failed to refresh JWT token - respoond json');
    });
  });

  describe('renewRefreshToken', () => {
    const mockRevokeToken = 'test-revoke-token';
    const mockConnection = AuthConnection.Google;

    it('successfully renews refresh token with valid parameters', async () => {
      // Arrange
      const mockResponse = {
        refresh_token: 'new-refresh-token',
        revoke_token: 'new-revoke-token',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.renewRefreshToken({
        connection: mockConnection,
        revokeToken: mockRevokeToken,
      });

      // Assert
      expect(mockCreateLoginHandler).toHaveBeenCalledWith(
        Platform.OS,
        mockConnection,
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        `${mockServerUrl}${AUTH_SERVER_RENEW_PATH}`,
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
      const result = await AuthTokenHandler.renewRefreshToken({
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
        AuthTokenHandler.renewRefreshToken({
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
        AuthTokenHandler.renewRefreshToken({
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
      const result = await AuthTokenHandler.renewRefreshToken({
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

  describe('revokeRefreshToken', () => {
    const mockRevokeToken = 'test-revoke-token';
    const mockConnection = AuthConnection.Google;

    it('successfully revokes refresh token with valid parameters', async () => {
      // Arrange
      fetchSpy.mockResolvedValueOnce({
        ok: true,
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
        `${mockServerUrl}${AUTH_SERVER_REVOKE_PATH}`,
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
      expect(result).toBeUndefined();
    });

    it('handles Apple connection type correctly', async () => {
      // Arrange
      fetchSpy.mockResolvedValueOnce({
        ok: true,
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
      expect(result).toBeUndefined();
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
      ).rejects.toThrow('Failed to revoke refresh token');
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

    it('handles JSON parsing errors in renewRefreshToken', async () => {
      // Arrange
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.renewRefreshToken({
          connection: AuthConnection.Google,
          revokeToken: 'test-token',
        }),
      ).rejects.toThrow('Invalid JSON');
    });

    it('revokeRefreshToken does not parse JSON response', async () => {
      // Arrange
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        // No json method needed since revokeRefreshToken doesn't parse response
      });

      // Act
      const result = await AuthTokenHandler.revokeRefreshToken({
        connection: AuthConnection.Google,
        revokeToken: 'test-token',
      });

      // Assert
      expect(result).toBeUndefined();
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

      await AuthTokenHandler.renewRefreshToken({
        connection: AuthConnection.Apple,
        revokeToken: 'test-token',
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

  describe('request parameter validation', () => {
    it('includes all required parameters in refreshJWTToken request body', async () => {
      // Arrange
      const mockResponse = {
        id_token: 'test-token',
        access_token: 'test-access',
        metadata_access_token: 'test-metadata',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Google,
        refreshToken: 'test-refresh-token',
      });

      // Assert
      const [, requestOptions] = fetchSpy.mock.calls[0];
      const requestBody = JSON.parse(requestOptions.body);

      expect(requestBody).toEqual({
        client_id: 'test-client-id',
        login_provider: AuthConnection.Google,
        network: 'test-network',
        refresh_token: 'test-refresh-token',
        grant_type: 'refresh_token',
      });
    });

    it('includes correct request headers for all methods', async () => {
      // Arrange
      const mockTokenResponse = {
        id_token: 'test-token',
        access_token: 'test-access',
        metadata_access_token: 'test-metadata',
      };

      const mockRenewResponse = {
        refresh_token: 'new-refresh',
        revoke_token: 'new-revoke',
      };

      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockRenewResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      // Act
      await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Google,
        refreshToken: 'test-token',
      });

      await AuthTokenHandler.renewRefreshToken({
        connection: AuthConnection.Google,
        revokeToken: 'test-revoke',
      });

      await AuthTokenHandler.revokeRefreshToken({
        connection: AuthConnection.Google,
        revokeToken: 'test-revoke',
      });

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(3);

      // Check headers for all calls
      fetchSpy.mock.calls.forEach(([, options]) => {
        expect(options.headers).toEqual({
          'Content-Type': 'application/json',
        });
        expect(options.method).toBe('POST');
      });
    });
  });

  describe('response data transformation', () => {
    it('transforms refreshJWTToken response correctly when all fields present', async () => {
      // Arrange
      const mockResponse = {
        id_token: 'jwt-token-123',
        access_token: 'access-abc',
        metadata_access_token: 'metadata-xyz',
        // Extra fields that should be ignored
        extra_field: 'should-be-ignored',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Google,
        refreshToken: 'test-token',
      });

      // Assert
      expect(result).toEqual({
        idTokens: ['jwt-token-123'],
        accessToken: 'access-abc',
        metadataAccessToken: 'metadata-xyz',
      });
    });

    it('throws error when required tokens are missing in refreshJWTToken', async () => {
      // Arrange
      const mockResponse = {
        id_token: 'jwt-token-123',
        // Missing access_token and metadata_access_token
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: AuthConnection.Google,
          refreshToken: 'test-token',
        }),
      ).rejects.toThrow('Failed to refresh JWT token - respoond json');
    });

    it('transforms renewRefreshToken response correctly when all fields present', async () => {
      // Arrange
      const mockResponse = {
        refresh_token: 'new-refresh-456',
        revoke_token: 'new-revoke-789',
        // Extra fields that should be ignored
        expires_in: 3600,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.renewRefreshToken({
        connection: AuthConnection.Google,
        revokeToken: 'test-revoke',
      });

      // Assert
      expect(result).toEqual({
        newRefreshToken: 'new-refresh-456',
        newRevokeToken: 'new-revoke-789',
      });
    });
  });

  describe('error response handling', () => {
    it('provides specific error messages for different HTTP status codes in refreshJWTToken', async () => {
      // Test 401 Unauthorized
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: AuthConnection.Google,
          refreshToken: 'invalid-token',
        }),
      ).rejects.toThrow('Failed to refresh JWT token');

      // Test 500 Internal Server Error
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: AuthConnection.Google,
          refreshToken: 'test-token',
        }),
      ).rejects.toThrow('Failed to refresh JWT token');
    });

    it('provides specific error messages for different HTTP status codes in renewRefreshToken', async () => {
      // Test 403 Forbidden
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(
        AuthTokenHandler.renewRefreshToken({
          connection: AuthConnection.Google,
          revokeToken: 'invalid-revoke',
        }),
      ).rejects.toThrow('Failed to renew refresh token - Forbidden');
    });

    it('provides specific error messages for different HTTP status codes in revokeRefreshToken', async () => {
      // Test 404 Not Found
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        AuthTokenHandler.revokeRefreshToken({
          connection: AuthConnection.Google,
          revokeToken: 'nonexistent-token',
        }),
      ).rejects.toThrow('Failed to revoke refresh token - Not Found');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('validates all required tokens are present and non-empty', async () => {
      // Arrange
      const mockResponse = {
        id_token: 'valid-id-token',
        access_token: 'valid-access-token',
        metadata_access_token: 'valid-metadata-token',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Google,
        refreshToken: 'test-token',
      });

      // Assert
      expect(result).toEqual({
        idTokens: ['valid-id-token'],
        accessToken: 'valid-access-token',
        metadataAccessToken: 'valid-metadata-token',
      });
    });

    it('throws error when tokens are empty strings', async () => {
      // Arrange
      const mockResponse = {
        id_token: '',
        access_token: '',
        metadata_access_token: '',
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: AuthConnection.Google,
          refreshToken: '',
        }),
      ).rejects.toThrow('Failed to refresh JWT token - respoond json');
    });

    it('throws error when tokens are null/undefined', async () => {
      // Arrange
      const mockResponse = {
        id_token: null,
        access_token: null,
        metadata_access_token: undefined,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act & Assert
      await expect(
        AuthTokenHandler.refreshJWTToken({
          connection: AuthConnection.Google,
          refreshToken: 'test-token',
        }),
      ).rejects.toThrow('Failed to refresh JWT token - respoond json');
    });

    it('handles very long token values', async () => {
      // Arrange
      const longToken = 'a'.repeat(5000); // Very long token
      const mockResponse = {
        id_token: longToken,
        access_token: longToken,
        metadata_access_token: longToken,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      // Act
      const result = await AuthTokenHandler.refreshJWTToken({
        connection: AuthConnection.Google,
        refreshToken: longToken,
      });

      // Assert
      expect(result.idTokens[0]).toBe(longToken);
      expect(result.accessToken).toBe(longToken);
      expect(result.metadataAccessToken).toBe(longToken);
    });
  });
});
