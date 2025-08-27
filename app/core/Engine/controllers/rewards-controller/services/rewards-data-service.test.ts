/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import {
  RewardsDataService,
  type RewardsDataServiceMessenger,
} from './rewards-data-service';
import type {
  LoginResponseDto,
  EstimatePointsDto,
  EstimatedPointsDto,
} from '../types';
import { getSubscriptionToken } from '../utils/multi-subscription-token-vault';
import AppConstants from '../../../../AppConstants';

// Mock dependencies
jest.mock('../utils/multi-subscription-token-vault');
jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: 'https://api.rewards.test',
  SWAPS: {
    CLIENT_ID: 'mobile',
  },
}));
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.50.1'),
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

  const mockEstimatedPointsResponse: EstimatedPointsDto = {
    pointsEstimate: 236, // 225.224644978×1.05 = 236.4858772269
    bonusBips: 500, // 5% bonus
  };

  const mockSwapEstimateBody: EstimatePointsDto = {
    activityType: 'SWAP',
    account: 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    activityContext: {
      swapContext: {
        srcAsset: {
          id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          amount: '25739959426',
        },
        destAsset: {
          id: 'eip155:1/slip44:60',
          amount: '9912500000000000000',
        },
        feeAsset: {
          id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          amount: '225224644', // 0.00875% of srcAsset: 25739.959426 * 0.0000875 = 2.252247 USDC
          usdPrice: '225.224644978',
        },
      },
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
      appType: 'mobile',
    });
  });

  describe('constructor', () => {
    it('should register the login action handler', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.any(Function),
      );
    });

    it('should register the estimatePoints action handler', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:estimatePoints',
        expect.any(Function),
      );
    });

    it('should register the getPerpsDiscount action handler', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        expect.any(Function),
      );
    });

    it('should store the messenger and fetch function', () => {
      // Test that the service was created without errors
      expect(rewardsDataService).toBeInstanceOf(RewardsDataService);
    });

    it('should register all action handlers', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledTimes(3);
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
            'rewards-client-id': 'mobile-7.50.1',
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

  describe('estimatePoints', () => {
    const mockPerpsEstimateBody: EstimatePointsDto = {
      activityType: 'PERPS',
      account: 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      activityContext: {
        perpsContext: {
          type: 'OPEN_POSITION',
          usdFeeValue: '50',
          coin: 'ETH',
        },
      },
    };

    beforeEach(() => {
      // Mock successful fetch response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockEstimatedPointsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    describe('successful estimation', () => {
      it('should successfully estimate points for SWAP activity', async () => {
        const result = await rewardsDataService.estimatePoints(
          mockSwapEstimateBody,
        );

        expect(result).toEqual(mockEstimatedPointsResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          `${AppConstants.REWARDS_API_URL}/points-estimation`,
          {
            credentials: 'omit',
            method: 'POST',
            body: JSON.stringify(mockSwapEstimateBody),
            headers: {
              'Content-Type': 'application/json',
              'rewards-client-id': 'mobile-7.50.1',
            },
            signal: expect.any(AbortSignal),
          },
        );
      });

      it('should successfully estimate points for PERPS activity', async () => {
        const result = await rewardsDataService.estimatePoints(
          mockPerpsEstimateBody,
        );

        expect(result).toEqual(mockEstimatedPointsResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          `${AppConstants.REWARDS_API_URL}/points-estimation`,
          {
            credentials: 'omit',
            method: 'POST',
            body: JSON.stringify(mockPerpsEstimateBody),
            headers: {
              'Content-Type': 'application/json',
              'rewards-client-id': 'mobile-7.50.1',
            },
            signal: expect.any(AbortSignal),
          },
        );
      });

      it('should use correct API endpoint', async () => {
        await rewardsDataService.estimatePoints(mockSwapEstimateBody);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.rewards.test/points-estimation',
          expect.any(Object),
        );
      });

      it('should set credentials to omit', async () => {
        await rewardsDataService.estimatePoints(mockSwapEstimateBody);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            credentials: 'omit',
          }),
        );
      });

      it('should include proper headers', async () => {
        await rewardsDataService.estimatePoints(mockSwapEstimateBody);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          }),
        );
      });
    });

    describe('error handling', () => {
      it('should throw error when response is not ok', async () => {
        const mockResponse = {
          ok: false,
          status: 400,
        } as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.estimatePoints(mockSwapEstimateBody),
        ).rejects.toThrow('Points estimation failed: 400');
      });

      it('should throw error for 401 unauthorized', async () => {
        const mockResponse = {
          ok: false,
          status: 401,
        } as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.estimatePoints(mockSwapEstimateBody),
        ).rejects.toThrow('Points estimation failed: 401');
      });

      it('should throw error for 404 not found', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
        } as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.estimatePoints(mockSwapEstimateBody),
        ).rejects.toThrow('Points estimation failed: 404');
      });

      it('should throw error for 500 server error', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
        } as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.estimatePoints(mockSwapEstimateBody),
        ).rejects.toThrow('Points estimation failed: 500');
      });

      it('should throw error when fetch fails', async () => {
        const fetchError = new Error('Network connection failed');
        mockFetch.mockRejectedValue(fetchError);

        await expect(
          rewardsDataService.estimatePoints(mockSwapEstimateBody),
        ).rejects.toThrow('Network connection failed');
      });

      it('should throw error when response parsing fails', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockRejectedValue(new Error('Invalid JSON response')),
        } as unknown as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.estimatePoints(mockSwapEstimateBody),
        ).rejects.toThrow('Invalid JSON response');
      });
    });

    describe('timeout handling', () => {
      it('should handle timeout correctly', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        mockFetch.mockRejectedValue(abortError);

        await expect(
          rewardsDataService.estimatePoints(mockSwapEstimateBody),
        ).rejects.toThrow('Request timeout after 10000ms');
      });

      it('should include AbortSignal in request', async () => {
        await rewardsDataService.estimatePoints(mockSwapEstimateBody);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          }),
        );
      });
    });

    describe('request body validation', () => {
      it('should send complete SWAP request body', async () => {
        await rewardsDataService.estimatePoints(mockSwapEstimateBody);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify(mockSwapEstimateBody),
          }),
        );
      });

      it('should send complete PERPS request body', async () => {
        await rewardsDataService.estimatePoints(mockPerpsEstimateBody);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify(mockPerpsEstimateBody),
          }),
        );
      });

      it('should handle empty activity context', async () => {
        const emptyContextBody: EstimatePointsDto = {
          activityType: 'SWAP',
          account: 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          activityContext: {},
        };

        await rewardsDataService.estimatePoints(emptyContextBody);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify(emptyContextBody),
          }),
        );
      });
    });

    describe('response parsing', () => {
      it('should parse successful response correctly', async () => {
        const customResponse: EstimatedPointsDto = {
          pointsEstimate: 250,
          bonusBips: 1000,
        };

        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(customResponse),
        } as unknown as Response;
        mockFetch.mockResolvedValue(mockResponse);

        const result = await rewardsDataService.estimatePoints(
          mockSwapEstimateBody,
        );

        expect(result).toEqual(customResponse);
        expect(result.pointsEstimate).toBe(250);
        expect(result.bonusBips).toBe(1000);
      });

      it('should handle zero points estimate', async () => {
        const zeroPointsResponse: EstimatedPointsDto = {
          pointsEstimate: 0,
          bonusBips: 0,
        };

        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(zeroPointsResponse),
        } as unknown as Response;
        mockFetch.mockResolvedValue(mockResponse);

        const result = await rewardsDataService.estimatePoints(
          mockSwapEstimateBody,
        );

        expect(result).toEqual(zeroPointsResponse);
        expect(result.pointsEstimate).toBe(0);
        expect(result.bonusBips).toBe(0);
      });
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

  describe('getPerpsDiscount', () => {
    // CAIP-10 account string for Ethereum mainnet
    const testAddress = 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
    const mockDiscountResponse = '5.5';

    beforeEach(() => {
      // Mock successful fetch response
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockDiscountResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    describe('successful requests', () => {
      it('should successfully get Perps discount for address', async () => {
        const result = await rewardsDataService.getPerpsDiscount({
          address: testAddress,
        });

        expect(result).toEqual(mockDiscountResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          `${AppConstants.REWARDS_API_URL}/public/rewards/perps-fee-discount/${testAddress}`,
          {
            credentials: 'omit',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'rewards-client-id': 'mobile-7.50.1',
            },
            signal: expect.any(AbortSignal),
          },
        );
      });

      it('should use correct API endpoint with address parameter', async () => {
        const customAddress = '0x1234567890abcdef1234567890abcdef12345678';
        await rewardsDataService.getPerpsDiscount({ address: customAddress });

        expect(mockFetch).toHaveBeenCalledWith(
          `https://api.rewards.test/public/rewards/perps-fee-discount/${customAddress}`,
          expect.any(Object),
        );
      });

      it('should use GET method', async () => {
        await rewardsDataService.getPerpsDiscount({ address: testAddress });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'GET',
          }),
        );
      });

      it('should set credentials to omit', async () => {
        await rewardsDataService.getPerpsDiscount({ address: testAddress });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            credentials: 'omit',
          }),
        );
      });

      it('should include proper headers', async () => {
        await rewardsDataService.getPerpsDiscount({ address: testAddress });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'rewards-client-id': 'mobile-7.50.1',
            }),
          }),
        );
      });
    });

    describe('error handling', () => {
      it('should throw error when response is not ok', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
        } as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.getPerpsDiscount({ address: testAddress }),
        ).rejects.toThrow('Get Perps discount failed: 404');
      });

      it('should throw error for 400 bad request', async () => {
        const mockResponse = {
          ok: false,
          status: 400,
        } as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.getPerpsDiscount({ address: testAddress }),
        ).rejects.toThrow('Get Perps discount failed: 400');
      });

      it('should throw error for 401 unauthorized', async () => {
        const mockResponse = {
          ok: false,
          status: 401,
        } as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.getPerpsDiscount({ address: testAddress }),
        ).rejects.toThrow('Get Perps discount failed: 401');
      });

      it('should throw error for 500 server error', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
        } as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.getPerpsDiscount({ address: testAddress }),
        ).rejects.toThrow('Get Perps discount failed: 500');
      });

      it('should throw error when fetch fails', async () => {
        const fetchError = new Error('Network connection failed');
        mockFetch.mockRejectedValue(fetchError);

        await expect(
          rewardsDataService.getPerpsDiscount({ address: testAddress }),
        ).rejects.toThrow('Network connection failed');
      });

      it('should throw error when response text parsing fails', async () => {
        const mockResponse = {
          ok: true,
          text: jest.fn().mockRejectedValue(new Error('Invalid response')),
        } as unknown as Response;
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          rewardsDataService.getPerpsDiscount({ address: testAddress }),
        ).rejects.toThrow('Invalid response');
      });
    });

    describe('timeout handling', () => {
      it('should handle timeout correctly', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        mockFetch.mockRejectedValue(abortError);

        await expect(
          rewardsDataService.getPerpsDiscount({ address: testAddress }),
        ).rejects.toThrow('Request timeout after 10000ms');
      });

      it('should include AbortSignal in request', async () => {
        await rewardsDataService.getPerpsDiscount({ address: testAddress });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          }),
        );
      });
    });

    describe('response parsing', () => {
      it('should parse successful text response correctly', async () => {
        const customDiscountResponse = '10.25';
        const mockResponse = {
          ok: true,
          text: jest.fn().mockResolvedValue(customDiscountResponse),
        } as unknown as Response;
        mockFetch.mockResolvedValue(mockResponse);

        const result = await rewardsDataService.getPerpsDiscount({
          address: testAddress,
        });

        expect(result).toEqual(customDiscountResponse);
        expect(result).toBe('10.25');
      });

      it('should handle zero discount response', async () => {
        const zeroDiscountResponse = '0';
        const mockResponse = {
          ok: true,
          text: jest.fn().mockResolvedValue(zeroDiscountResponse),
        } as unknown as Response;
        mockFetch.mockResolvedValue(mockResponse);

        const result = await rewardsDataService.getPerpsDiscount({
          address: testAddress,
        });

        expect(result).toEqual(zeroDiscountResponse);
        expect(result).toBe('0');
      });

      it('should handle empty string response', async () => {
        const emptyResponse = '';
        const mockResponse = {
          ok: true,
          text: jest.fn().mockResolvedValue(emptyResponse),
        } as unknown as Response;
        mockFetch.mockResolvedValue(mockResponse);

        const result = await rewardsDataService.getPerpsDiscount({
          address: testAddress,
        });

        expect(result).toEqual(emptyResponse);
        expect(result).toBe('');
      });

      it('should handle numeric string responses', async () => {
        const numericResponse = '123.45';
        const mockResponse = {
          ok: true,
          text: jest.fn().mockResolvedValue(numericResponse),
        } as unknown as Response;
        mockFetch.mockResolvedValue(mockResponse);

        const result = await rewardsDataService.getPerpsDiscount({
          address: testAddress,
        });

        expect(result).toEqual(numericResponse);
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('authentication integration', () => {
    it('should make requests without authentication by default', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockEstimatedPointsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await rewardsDataService.estimatePoints(mockSwapEstimateBody);

      // Should not call token retrieval when no subscription ID is provided
      expect(mockGetSubscriptionToken).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
            // Should not include rewards-api-key header
          },
        }),
      );
    });

    it('should handle console warning when token retrieval fails', async () => {
      // This test verifies that the service handles token retrieval gracefully
      // The actual token retrieval happens in the private makeRequest method
      // but we can test that the service continues to work when authentication fails
      mockGetSubscriptionToken.mockRejectedValue(
        new Error('Token retrieval failed'),
      );

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Do nothing
        });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockEstimatedPointsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // The estimatePoints method should still work even if authentication fails internally
      const result = await rewardsDataService.estimatePoints(
        mockSwapEstimateBody,
      );

      expect(result).toEqual(mockEstimatedPointsResponse);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Client Header', () => {
    it('should include rewards-client-id header in requests', async () => {
      // Mock successful response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await rewardsDataService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xsignature',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-login',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should handle errors when getting app version gracefully', async () => {
      // Mock getVersion to throw an error
      const originalGetVersion = require('react-native-device-info').getVersion;
      require('react-native-device-info').getVersion = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Version not available');
        });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await rewardsDataService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xsignature',
      });

      // Should still make the request without the client header
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-login',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );

      // Should not include rewards-client-id header when version retrieval fails
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs?.headers).not.toHaveProperty('rewards-client-id');

      // Restore original function
      require('react-native-device-info').getVersion = originalGetVersion;
    });
  });
});
