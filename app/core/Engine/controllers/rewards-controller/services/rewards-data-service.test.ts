import {
  RewardsDataService,
  type RewardsDataServiceMessenger,
} from './rewards-data-service';
import type {
  LoginResponseDto,
  EstimatePointsDto,
  EstimatedPointsDto,
  SeasonStatusDto,
  SubscriptionReferralDetailsDto,
} from '../types';
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

  const mockEstimatedPointsResponse: EstimatedPointsDto = {
    pointsEstimate: 150,
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
          amount: '100',
        },
      },
    },
  };

  const mockSeasonStatusResponse: SeasonStatusDto = {
    season: {
      id: 'season-123',
      name: 'Test Season',
      startDate: new Date('2023-06-01T00:00:00Z'),
      endDate: new Date('2023-08-31T23:59:59Z'),
      tiers: [
        {
          id: 'tier-gold',
          name: 'Gold Tier',
        },
        {
          id: 'tier-silver',
          name: 'Silver Tier',
        },
      ],
    },
    balance: {
      total: 1000,
      refereePortion: 500,
      updatedAt: new Date('2023-12-01T10:00:00Z'),
    },
    currentTierId: 'tier-gold',
  };

  const mockReferralDetailsResponse: SubscriptionReferralDetailsDto = {
    referralCode: 'TEST123',
    totalReferees: 5,
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

    it('should register the estimatePoints action handler', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:estimatePoints',
        expect.any(Function),
      );
    });

    it('should store the messenger and fetch function', () => {
      // Test that the service was created without errors
      expect(rewardsDataService).toBeInstanceOf(RewardsDataService);
    });

    it('should register both action handlers', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledTimes(4);
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

  describe('estimatePoints', () => {
    const mockPerpsEstimateBody: EstimatePointsDto = {
      activityType: 'PERPS',
      account: 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      activityContext: {
        perpsContext: {
          perpsType: 'OPEN_POSITION',
          usdFeeValue: '50',
          coin: 'ETH',
          isBuy: true,
          size: '100',
          orderType: 'market',
          slippage: 0.01,
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
            // Should not include rewards-api-key header
          },
        }),
      );
    });
  });

  describe('getSeasonStatus', () => {
    const mockSeasonId = 'season-123';
    const mockSubscriptionId = 'subscription-456';

    beforeEach(() => {
      // Mock successful fetch response for season status
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          season: {
            ...mockSeasonStatusResponse.season,
            startDate: '2023-06-01T00:00:00Z', // API returns strings, not Date objects
            endDate: '2023-08-31T23:59:59Z',
          },
          balance: {
            ...mockSeasonStatusResponse.balance,
            updatedAt: '2023-12-01T10:00:00Z', // API returns string, not Date
          },
          currentTierId: mockSeasonStatusResponse.currentTierId,
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should successfully get season status', async () => {
      const result = await rewardsDataService.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      expect(result).toEqual(mockSeasonStatusResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${AppConstants.REWARDS_API_URL}/seasons/${mockSeasonId}/status`,
        {
          credentials: 'omit',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'rewards-api-key': 'test-bearer-token',
          },
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('should convert date strings to Date objects', async () => {
      const result = await rewardsDataService.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      // Check balance updatedAt
      expect(result.balance.updatedAt).toBeInstanceOf(Date);
      expect(result.balance.updatedAt.getTime()).toBe(
        new Date('2023-12-01T10:00:00Z').getTime(),
      );

      // Check season dates
      expect(result.season.startDate).toBeInstanceOf(Date);
      expect(result.season.startDate.getTime()).toBe(
        new Date('2023-06-01T00:00:00Z').getTime(),
      );
      expect(result.season.endDate).toBeInstanceOf(Date);
      expect(result.season.endDate.getTime()).toBe(
        new Date('2023-08-31T23:59:59Z').getTime(),
      );
    });

    it('should include authentication headers with subscription token', async () => {
      await rewardsDataService.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'rewards-api-key': 'test-bearer-token',
          }),
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

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        rewardsDataService.getSeasonStatus(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Get season status failed: 404');
    });

    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(
        rewardsDataService.getSeasonStatus(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Network error');
    });

    it('should handle missing subscription token gracefully', async () => {
      // Mock token retrieval failure
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const result = await rewardsDataService.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      expect(result).toEqual(mockSeasonStatusResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-api-key': expect.any(String),
          }),
        }),
      );
    });
  });

  describe('getReferralDetails', () => {
    const mockSubscriptionId = 'test-subscription-123';

    beforeEach(() => {
      // Mock successful response for each test
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockReferralDetailsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should successfully get referral details', async () => {
      const result = await rewardsDataService.getReferralDetails(
        mockSubscriptionId,
      );

      expect(result).toEqual(mockReferralDetailsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/subscriptions/referral-details',
        expect.objectContaining({
          method: 'GET',
          credentials: 'omit',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-api-key': 'test-bearer-token',
          }),
        }),
      );
    });

    it('should include subscription ID in token retrieval', async () => {
      await rewardsDataService.getReferralDetails(mockSubscriptionId);

      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'rewards-api-key': 'test-bearer-token',
          }),
        }),
      );
    });

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        rewardsDataService.getReferralDetails(mockSubscriptionId),
      ).rejects.toThrow('Get referral details failed: 404');
    });

    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(
        rewardsDataService.getReferralDetails(mockSubscriptionId),
      ).rejects.toThrow('Network error');
    });

    it('should handle missing subscription token gracefully', async () => {
      // Mock token retrieval failure
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const result = await rewardsDataService.getReferralDetails(
        mockSubscriptionId,
      );

      expect(result).toEqual(mockReferralDetailsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-api-key': expect.any(String),
          }),
        }),
      );
    });

    it('should handle subscription token retrieval error', async () => {
      // Mock token retrieval throwing an error
      mockGetSubscriptionToken.mockRejectedValue(new Error('Token error'));

      const result = await rewardsDataService.getReferralDetails(
        mockSubscriptionId,
      );

      expect(result).toEqual(mockReferralDetailsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-api-key': expect.any(String),
          }),
        }),
      );
    });

    it('should handle timeout correctly', async () => {
      // Mock fetch that never resolves (simulate timeout)
      mockFetch.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 100);
          }),
      );

      await expect(
        rewardsDataService.getReferralDetails(mockSubscriptionId),
      ).rejects.toThrow('AbortError');
    });
  });

  describe('action handler registration', () => {
    it('should register all action handlers correctly', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledTimes(4);
      expect(mockMessenger.registerActionHandler).toHaveBeenNthCalledWith(
        1,
        'RewardsDataService:login',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenNthCalledWith(
        2,
        'RewardsDataService:getSeasonStatus',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenNthCalledWith(
        3,
        'RewardsDataService:getReferralDetails',
        expect.any(Function),
      );
    });

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

    it('should bind the estimatePoints method correctly', async () => {
      // Get the registered handler function for estimatePoints
      const registeredHandler = mockMessenger.registerActionHandler.mock
        .calls[1][1] as typeof rewardsDataService.estimatePoints;

      // Mock successful response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockEstimatedPointsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const mockEstimateBody: EstimatePointsDto = {
        activityType: 'SWAP',
        account: 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        activityContext: {
          swapContext: {
            srcAsset: {
              id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              amount: '1000000',
            },
            destAsset: {
              id: 'eip155:1/slip44:60',
              amount: '500000000000000000',
            },
            feeAsset: {
              id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              amount: '50',
            },
          },
        },
      };

      // Call the registered handler
      const result = await registeredHandler(mockEstimateBody);

      expect(result).toEqual(mockEstimatedPointsResponse);
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
