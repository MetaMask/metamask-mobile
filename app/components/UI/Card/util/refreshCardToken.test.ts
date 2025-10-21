import Logger from '../../../../util/Logger';
import { CardError, CardErrorType } from '../types';
import { refreshCardToken } from './refreshCardToken';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from './mapBaanxApiUrl';

jest.mock('../../../../util/Logger');
jest.mock('./mapBaanxApiUrl');

const mockLogger = jest.mocked(Logger);
const mockGetDefaultBaanxApiBaseUrlForMetaMaskEnv = jest.mocked(
  getDefaultBaanxApiBaseUrlForMetaMaskEnv,
);

// Mock global fetch
global.fetch = jest.fn();

describe('refreshCardToken', () => {
  const mockApiKey = 'test-api-key';
  const mockBaseUrl = 'https://foxdev2-ag.foxcard.io';
  const mockRefreshToken = 'refresh-token-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env.MM_CARD_BAANX_API_CLIENT_KEY = mockApiKey;
    mockGetDefaultBaanxApiBaseUrlForMetaMaskEnv.mockReturnValue(mockBaseUrl);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Successful token refresh', () => {
    it('refreshes token successfully for US location', async () => {
      const mockResponseData = {
        access_token: 'new-access-token',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      const result = await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/auth/oauth/token`,
        {
          method: 'POST',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
            'x-us-env': 'true',
            'x-client-key': mockApiKey,
            'x-secret-key': mockApiKey,
          },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: mockRefreshToken,
          }),
          signal: expect.any(AbortSignal),
        },
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresIn: 3600,
        refreshToken: 'new-refresh-token',
        refreshTokenExpiresIn: 86400,
        location: 'us',
      });
    });

    it('refreshes token successfully for international location', async () => {
      const mockResponseData = {
        access_token: 'new-access-token',
        expires_in: 7200,
        refresh_token: 'new-refresh-token',
        refresh_token_expires_in: 172800,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'international');
      jest.runAllTimers();
      const result = await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/auth/oauth/token`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-us-env': 'false',
          }),
        }),
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresIn: 7200,
        refreshToken: 'new-refresh-token',
        refreshTokenExpiresIn: 172800,
        location: 'international',
      });
    });

    it('uses correct environment-specific base URL', async () => {
      const customBaseUrl = 'https://foxdev2-ag.foxcard.io';
      mockGetDefaultBaanxApiBaseUrlForMetaMaskEnv.mockReturnValue(
        customBaseUrl,
      );

      const mockResponseData = {
        access_token: 'token',
        expires_in: 3600,
        refresh_token: 'refresh',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        `${customBaseUrl}/v1/auth/oauth/token`,
        expect.any(Object),
      );
    });
  });

  describe('HTTP error responses', () => {
    it('throws INVALID_CREDENTIALS error for 401 status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
        message: 'Token refresh failed. Please try logging in again.',
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(CardError),
        expect.stringContaining('Token refresh failed - invalid credentials'),
      );
    });

    it('throws INVALID_CREDENTIALS error for 403 status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('Forbidden'),
      });

      const promise = refreshCardToken(mockRefreshToken, 'international');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.INVALID_CREDENTIALS,
        message: 'Token refresh failed. Please try logging in again.',
      });
    });

    it('throws SERVER_ERROR for 500 status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Token refresh failed with status 500',
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Token refresh failed with status 500'),
      );
    });

    it('throws SERVER_ERROR for 400 status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
        message: 'Token refresh failed with status 400',
      });
    });

    it('handles error response when text parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockRejectedValue(new Error('Parse error')),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.SERVER_ERROR,
      });
    });
  });

  describe('Timeout handling', () => {
    it('throws TIMEOUT_ERROR when request times out', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(abortError), 30000);
          }),
      );

      const promise = refreshCardToken(mockRefreshToken, 'us');

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(30000);

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.TIMEOUT_ERROR,
        message:
          'Token refresh request timed out. Please check your connection.',
      });
    });

    it('clears timeout after successful response', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const mockResponseData = {
        access_token: 'token',
        expires_in: 3600,
        refresh_token: 'refresh',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      await promise;

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('clears timeout after error response', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Error'),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Network errors', () => {
    it('throws NETWORK_ERROR when fetch fails with network error', async () => {
      const networkError = new Error('Network request failed');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.NETWORK_ERROR,
        message:
          'Network error during token refresh. Please check your connection.',
      });
    });

    it('throws NETWORK_ERROR for connection refused', async () => {
      const connectionError = new Error('ECONNREFUSED');
      (global.fetch as jest.Mock).mockRejectedValue(connectionError);

      const promise = refreshCardToken(mockRefreshToken, 'international');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.NETWORK_ERROR,
      });
    });
  });

  describe('Unknown errors', () => {
    it('throws UNKNOWN_ERROR for non-Error exceptions', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('string error');

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(CardError);
      await expect(promise).rejects.toMatchObject({
        type: CardErrorType.UNKNOWN_ERROR,
        message: 'An unexpected error occurred during token refresh.',
      });
    });

    it('re-throws CardError instances without wrapping', async () => {
      const cardError = new CardError(
        CardErrorType.INVALID_CREDENTIALS,
        'Custom error',
      );
      (global.fetch as jest.Mock).mockRejectedValue(cardError);

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();

      await expect(promise).rejects.toBe(cardError);
    });
  });

  describe('Request body and headers', () => {
    it('sends correct request body structure', async () => {
      const mockResponseData = {
        access_token: 'token',
        expires_in: 3600,
        refresh_token: 'refresh',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: mockRefreshToken,
          }),
        }),
      );
    });

    it('sets x-us-env header to true for US location', async () => {
      const mockResponseData = {
        access_token: 'token',
        expires_in: 3600,
        refresh_token: 'refresh',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-us-env': 'true',
          }),
        }),
      );
    });

    it('sets x-us-env header to false for international location', async () => {
      const mockResponseData = {
        access_token: 'token',
        expires_in: 3600,
        refresh_token: 'refresh',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'international');
      jest.runAllTimers();
      await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-us-env': 'false',
          }),
        }),
      );
    });

    it('includes both client and secret keys in headers', async () => {
      const mockResponseData = {
        access_token: 'token',
        expires_in: 3600,
        refresh_token: 'refresh',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-client-key': mockApiKey,
            'x-secret-key': mockApiKey,
          }),
        }),
      );
    });

    it('sets credentials to omit', async () => {
      const mockResponseData = {
        access_token: 'token',
        expires_in: 3600,
        refresh_token: 'refresh',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'omit',
        }),
      );
    });
  });

  describe('Response parsing', () => {
    it('correctly maps snake_case response to camelCase', async () => {
      const mockResponseData = {
        access_token: 'mapped-access-token',
        expires_in: 7200,
        refresh_token: 'mapped-refresh-token',
        refresh_token_expires_in: 172800,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promise = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      const result = await promise;

      expect(result.accessToken).toBe('mapped-access-token');
      expect(result.expiresIn).toBe(7200);
      expect(result.refreshToken).toBe('mapped-refresh-token');
      expect(result.refreshTokenExpiresIn).toBe(172800);
    });

    it('includes location in response', async () => {
      const mockResponseData = {
        access_token: 'token',
        expires_in: 3600,
        refresh_token: 'refresh',
        refresh_token_expires_in: 86400,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promiseUs = refreshCardToken(mockRefreshToken, 'us');
      jest.runAllTimers();
      const resultUs = await promiseUs;

      expect(resultUs.location).toBe('us');

      jest.clearAllMocks();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      });

      const promiseIntl = refreshCardToken(mockRefreshToken, 'international');
      jest.runAllTimers();
      const resultIntl = await promiseIntl;

      expect(resultIntl.location).toBe('international');
    });
  });
});
