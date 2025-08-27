import {
  RewardsDataService,
  type RewardsDataServiceMessenger,
} from './rewards-data-service';
import type { LoginResponseDto } from '../types';
import { getSubscriptionToken } from '../utils/multi-subscription-token-vault';
import AppConstants from '../../../../AppConstants';

// Mock dependencies
jest.mock('../utils/multi-subscription-token-vault');
jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: 'https://api.rewards.test',
}));

const mockGetSubscriptionToken = getSubscriptionToken as jest.MockedFunction<
  typeof getSubscriptionToken
>;

describe('RewardsDataService', () => {
  let mockMessenger: jest.Mocked<RewardsDataServiceMessenger>;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let rewardsDataService: RewardsDataService;

  const mockLoginResponse: LoginResponseDto = {
    sessionId: 'test-session-id',
    subscription: {
      id: 'test-subscription-id',
      referralCode: 'test-referral-code',
    },
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock messenger
    mockMessenger = {
      registerActionHandler: jest.fn(),
      call: jest.fn(),
    } as unknown as jest.Mocked<RewardsDataServiceMessenger>;

    // Mock fetch
    mockFetch = jest.fn();

    // Mock successful token retrieval by default
    mockGetSubscriptionToken.mockResolvedValue({
      success: true,
      token: 'test-bearer-token',
    });

    // Create service instance
    rewardsDataService = new RewardsDataService({
      messenger: mockMessenger,
      fetch: mockFetch,
    });
  });

  describe('constructor', () => {
    it('should register the login action handler', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.any(Function),
      );
    });

    it('should store the messenger and fetch function', () => {
      // Test that the service was created without errors
      expect(rewardsDataService).toBeInstanceOf(RewardsDataService);
    });
  });

  describe('login', () => {
    const mockLoginBody = {
      account: '0x123456789',
      timestamp: 1234567890,
      signature: '0xabcdef',
    };

    beforeEach(() => {
      // Mock successful fetch response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should successfully login', async () => {
      const result = await rewardsDataService.login(mockLoginBody);

      expect(result).toEqual(mockLoginResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${AppConstants.REWARDS_API_URL}/auth/mobile-login`,
        {
          credentials: 'omit',
          method: 'POST',
          body: JSON.stringify(mockLoginBody),
          headers: {
            'Content-Type': 'application/json',
          },
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(rewardsDataService.login(mockLoginBody)).rejects.toThrow(
        'Login failed: 401',
      );
    });

    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(rewardsDataService.login(mockLoginBody)).rejects.toThrow(
        'Network error',
      );
    });

    it('should throw error when response parsing fails', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(rewardsDataService.login(mockLoginBody)).rejects.toThrow(
        'Invalid JSON',
      );
    });

    it('should use correct API endpoint', async () => {
      await rewardsDataService.login(mockLoginBody);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-login',
        expect.any(Object),
      );
    });

    it('should set credentials to omit', async () => {
      await rewardsDataService.login(mockLoginBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'omit',
        }),
      );
    });
  });

  describe('timeout functionality', () => {
    it('should include AbortSignal in requests', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await rewardsDataService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xabc',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should timeout with custom timeout', async () => {
      // Mock fetch to throw AbortError immediately
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      // Test the makeRequest method directly with a custom timeout
      const makeRequestPromise = (
        rewardsDataService as unknown as {
          makeRequest: (
            endpoint: string,
            options?: RequestInit,
            subscriptionId?: string,
            timeoutMs?: number,
          ) => Promise<Response>;
        }
      ).makeRequest(
        '/test-endpoint',
        { method: 'GET' },
        undefined,
        2000, // 2 second timeout
      );

      await expect(makeRequestPromise).rejects.toThrow(
        'Request timeout after 2000ms',
      );
    });

    it('should handle AbortError correctly', async () => {
      // Mock fetch to throw AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const loginPromise = rewardsDataService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xabc',
      });

      await expect(loginPromise).rejects.toThrow(
        'Request timeout after 10000ms',
      );
    });

    it('should pass through non-timeout errors', async () => {
      // Mock fetch to throw a different error
      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';
      mockFetch.mockRejectedValue(networkError);

      const loginPromise = rewardsDataService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xabc',
      });

      await expect(loginPromise).rejects.toThrow('Network connection failed');
    });

    it('should include AbortController signal in fetch options', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await rewardsDataService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xabc',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should clear timeout on successful response', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await rewardsDataService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xabc',
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout on error response', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      await expect(
        rewardsDataService.login({
          account: '0x123',
          timestamp: 1234567890,
          signature: '0xabc',
        }),
      ).rejects.toThrow('Network error');

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('action handler registration', () => {
    it('should bind the login method correctly', async () => {
      // Get the registered handler function
      const registeredHandler = mockMessenger.registerActionHandler.mock
        .calls[0][1] as typeof rewardsDataService.login;

      // Mock successful response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const mockLoginBody = {
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xabc',
      };

      // Call the registered handler
      const result = await registeredHandler(mockLoginBody);

      expect(result).toEqual(mockLoginResponse);
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
