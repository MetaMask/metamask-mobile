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
  PointsBoostEnvelopeDto,
} from '../types';
import { getSubscriptionToken } from '../utils/multi-subscription-token-vault';
import type { CaipAccountId } from '@metamask/utils';
import AppConstants from '../../../../AppConstants';
import { successfulFetch } from '@metamask/controller-utils';

// Mock dependencies
jest.mock('../utils/multi-subscription-token-vault');
jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: 'https://api.rewards.test',
  IS_DEV: false, // Default to PROD, will be overridden in tests
}));
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.50.1'),
}));
jest.mock('@metamask/controller-utils', () => ({
  successfulFetch: jest.fn(),
}));

const mockGetSubscriptionToken = getSubscriptionToken as jest.MockedFunction<
  typeof getSubscriptionToken
>;
const mockSuccessfulFetch = successfulFetch as jest.MockedFunction<
  typeof successfulFetch
>;

describe('RewardsDataService', () => {
  let mockMessenger: jest.Mocked<RewardsDataServiceMessenger>;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let service: RewardsDataService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMessenger = {
      registerActionHandler: jest.fn(),
      call: jest.fn(),
    } as unknown as jest.Mocked<RewardsDataServiceMessenger>;

    mockFetch = jest.fn();
    mockGetSubscriptionToken.mockResolvedValue({
      success: true,
      token: 'test-access-token',
    });

    service = new RewardsDataService({
      messenger: mockMessenger,
      fetch: mockFetch,
      appType: 'mobile',
      locale: 'en-US',
    });
  });

  describe('initialization', () => {
    it('should register all action handlers', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getPointsEvents',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:estimatePoints',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getOptInStatus',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:optOut',
        expect.any(Function),
      );
    });
  });

  describe('login', () => {
    const mockLoginRequest = {
      account: '0x123456789',
      timestamp: 1234567890,
      signature: '0xabcdef',
    };

    const mockLoginResponse: LoginResponseDto = {
      sessionId: 'test-session-id',
      subscription: {
        id: 'test-subscription-id',
        referralCode: 'test-referral-code',
        accounts: [],
      },
    };

    it('should successfully login', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.login(mockLoginRequest);

      expect(result).toEqual(mockLoginResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockLoginRequest),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should handle login errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.login(mockLoginRequest)).rejects.toThrow(
        'Login failed: 401',
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.login(mockLoginRequest)).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('getPointsEvents', () => {
    const mockGetPointsEventsRequest = {
      seasonId: 'current',
      subscriptionId: 'sub-123',
      cursor: null,
    };

    const mockPointsEventsResponse = {
      has_more: true,
      cursor: 'next-cursor-123',
      total_results: 100,
      results: [
        {
          id: 'event-123',
          timestamp: '2024-01-01T10:00:00Z',
          value: 100,
          bonus: { bips: 200, bonuses: ['loyalty'] },
          accountAddress: '0x123456789',
          type: 'SWAP',
          payload: {
            srcAsset: {
              amount: '1000000000000000000',
              type: 'eip155:1/slip44:60',
              decimals: 18,
              name: 'Ethereum',
              symbol: 'ETH',
            },
            destAsset: {
              amount: '4500000000',
              type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              decimals: 6,
              name: 'USD Coin',
              symbol: 'USDC',
            },
            txHash: '0xabcdef123456',
          },
        },
        {
          id: 'event-456',
          timestamp: '2024-01-01T11:00:00Z',
          value: 50,
          bonus: null,
          accountAddress: '0x987654321',
          type: 'REFERRAL',
          payload: null,
        },
      ],
    };

    it('should successfully get points events without cursor', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPointsEventsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getPointsEvents(mockGetPointsEventsRequest);

      expect(result).toEqual(mockPointsEventsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/seasons/current/points-events',
        {
          credentials: 'omit',
          method: 'GET',
          headers: {
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
          },
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('should successfully get points events with cursor', async () => {
      const requestWithCursor = {
        ...mockGetPointsEventsRequest,
        cursor: 'cursor-abc123',
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          ...mockPointsEventsResponse,
          has_more: false,
          cursor: null,
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getPointsEvents(requestWithCursor);

      expect(result.has_more).toBe(false);
      expect(result.cursor).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/seasons/current/points-events?cursor=cursor-abc123',
        expect.objectContaining({
          method: 'GET',
          credentials: 'omit',
        }),
      );
    });

    it('should properly encode cursor parameter in URL', async () => {
      const requestWithSpecialCursor = {
        ...mockGetPointsEventsRequest,
        cursor: 'cursor/with+special=chars',
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPointsEventsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await service.getPointsEvents(requestWithSpecialCursor);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/seasons/current/points-events?cursor=cursor%2Fwith%2Bspecial%3Dchars',
        expect.any(Object),
      );
    });

    it('should include authentication headers with subscription token', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPointsEventsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await service.getPointsEvents(mockGetPointsEventsRequest);

      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(
        mockGetPointsEventsRequest.subscriptionId,
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should handle missing subscription token gracefully', async () => {
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPointsEventsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getPointsEvents(mockGetPointsEventsRequest);

      expect(result).toEqual(mockPointsEventsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });

    it('should handle get points events errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        service.getPointsEvents(mockGetPointsEventsRequest),
      ).rejects.toThrow('Get points events failed: 404');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        service.getPointsEvents(mockGetPointsEventsRequest),
      ).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(
        service.getPointsEvents(mockGetPointsEventsRequest),
      ).rejects.toThrow('Request timeout after 10000ms');
    });
  });

  describe('estimatePoints', () => {
    const mockEstimateRequest: EstimatePointsDto = {
      activityType: 'SWAP',
      account: 'eip155:1:0x123',
      activityContext: {
        swapContext: {
          srcAsset: { id: 'eip155:1/slip44:60', amount: '1000000000000000000' },
          destAsset: {
            id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            amount: '4500000000',
          },
          feeAsset: { id: 'eip155:1/slip44:60', amount: '5000000000000000' },
        },
      },
    };

    const mockEstimateResponse: EstimatedPointsDto = {
      pointsEstimate: 100,
      bonusBips: 500,
    };

    it('should successfully estimate points', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockEstimateResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.estimatePoints(mockEstimateRequest);

      expect(result).toEqual(mockEstimateResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/points-estimation',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockEstimateRequest),
        }),
      );
    });

    it('should handle estimate points errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.estimatePoints(mockEstimateRequest)).rejects.toThrow(
        'Points estimation failed: 400',
      );
    });
  });

  describe('getPerpsDiscount', () => {
    const testAddress = 'eip155:1:0x123456789' as CaipAccountId;

    it('should successfully get perps discount', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('1,5.5'),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getPerpsDiscount({
        account: testAddress as CaipAccountId,
      });

      expect(result).toEqual({
        hasOptedIn: true,
        discount: 5.5,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.rewards.test/public/rewards/perps-fee-discount/${testAddress}`,
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should parse not opted in response', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('0,10.0'),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getPerpsDiscount({
        account: testAddress as CaipAccountId,
      });

      expect(result).toEqual({
        hasOptedIn: false,
        discount: 10.0,
      });
    });

    it('should handle perps discount errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        service.getPerpsDiscount({ account: testAddress as CaipAccountId }),
      ).rejects.toThrow('Get Perps discount failed: 404');
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('invalid_format'),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        service.getPerpsDiscount({ account: testAddress as CaipAccountId }),
      ).rejects.toThrow(
        'Invalid perps discount response format: invalid_format',
      );
    });
  });

  describe('timeout handling', () => {
    it('should handle request timeouts', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(
        service.login({
          account: '0x123',
          timestamp: 1234567890,
          signature: '0xabc',
        }),
      ).rejects.toThrow('Request timeout after 10000ms');
    });

    it('should include AbortSignal in requests', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await service.login({
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
  });

  describe('headers', () => {
    it('should include correct headers in requests', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await service.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xabc',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
            // Should not include rewards-access-token header
          },
        }),
      );
    });
  });

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
          pointsNeeded: 1000,
        },
        {
          id: 'tier-silver',
          name: 'Silver Tier',
          pointsNeeded: 500,
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
      const result = await service.getSeasonStatus(
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
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
          },
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('should convert date strings to Date objects', async () => {
      const result = await service.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      // Check balance updatedAt
      expect(result.balance.updatedAt).toBeInstanceOf(Date);
      expect(result.balance.updatedAt?.getTime()).toBe(
        new Date('2023-12-01T10:00:00Z').getTime(),
      );

      // Check season dates
      expect(result.season.startDate).toBeInstanceOf(Date);
      expect(result.season.startDate?.getTime()).toBe(
        new Date('2023-06-01T00:00:00Z').getTime(),
      );
      expect(result.season.endDate).toBeInstanceOf(Date);
      expect(result.season.endDate.getTime()).toBe(
        new Date('2023-08-31T23:59:59Z').getTime(),
      );
    });

    it('should include authentication headers with subscription token', async () => {
      await service.getSeasonStatus(mockSeasonId, mockSubscriptionId);

      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
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
        service.getSeasonStatus(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Get season status failed: 404');
    });

    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(
        service.getSeasonStatus(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Network error');
    });

    it('should handle missing subscription token gracefully', async () => {
      // Mock token retrieval failure
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const result = await service.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      expect(result).toEqual(mockSeasonStatusResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });
  });

  describe('getReferralDetails', () => {
    const mockSubscriptionId = 'test-subscription-123';

    const mockReferralDetailsResponse: SubscriptionReferralDetailsDto = {
      referralCode: 'TEST123',
      totalReferees: 5,
    };

    beforeEach(() => {
      // Mock successful response for each test
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockReferralDetailsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should successfully get referral details', async () => {
      const result = await service.getReferralDetails(mockSubscriptionId);

      expect(result).toEqual(mockReferralDetailsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/subscriptions/referral-details',
        expect.objectContaining({
          method: 'GET',
          credentials: 'omit',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should include subscription ID in token retrieval', async () => {
      await service.getReferralDetails(mockSubscriptionId);

      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
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
        service.getReferralDetails(mockSubscriptionId),
      ).rejects.toThrow('Get referral details failed: 404');
    });

    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(
        service.getReferralDetails(mockSubscriptionId),
      ).rejects.toThrow('Network error');
    });

    it('should handle missing subscription token gracefully', async () => {
      // Mock token retrieval failure
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const result = await service.getReferralDetails(mockSubscriptionId);

      expect(result).toEqual(mockReferralDetailsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });

    it('should handle subscription token retrieval error', async () => {
      // Mock token retrieval throwing an error
      mockGetSubscriptionToken.mockRejectedValue(new Error('Token error'));

      const result = await service.getReferralDetails(mockSubscriptionId);

      expect(result).toEqual(mockReferralDetailsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
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
        service.getReferralDetails(mockSubscriptionId),
      ).rejects.toThrow('AbortError');
    });
  });

  const mockLoginResponse: LoginResponseDto = {
    sessionId: 'test-session-id',
    subscription: {
      id: 'test-subscription-id',
      referralCode: 'test-referral-code',
      accounts: [],
    },
  };

  describe('Client Header', () => {
    it('should include rewards-client-id header in requests', async () => {
      // Mock successful response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await service.login({
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
  });

  describe('Accept-Language Header', () => {
    it('should include Accept-Language header with default locale', async () => {
      // Arrange - service already initialized with default locale 'en-US'
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xsignature',
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-login',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept-Language': 'en-US',
          }),
        }),
      );
    });

    it('should include Accept-Language header with custom locale', async () => {
      // Arrange - create service with custom locale
      const customLocaleService = new RewardsDataService({
        messenger: mockMessenger,
        fetch: mockFetch,
        appType: 'mobile',
        locale: 'es-ES',
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await customLocaleService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xsignature',
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-login',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept-Language': 'es-ES',
          }),
        }),
      );
    });

    it('should not include Accept-Language header when locale is empty', async () => {
      // Arrange - create service with empty locale
      const emptyLocaleService = new RewardsDataService({
        messenger: mockMessenger,
        fetch: mockFetch,
        appType: 'mobile',
        locale: '',
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLoginResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await emptyLocaleService.login({
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xsignature',
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-login',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Accept-Language': expect.any(String),
          }),
        }),
      );
    });
  });

  describe('optin', () => {
    const mockOptinRequest = {
      challengeId: 'challenge-123',
      signature: '0xsignature123',
      referralCode: 'REF123',
    };

    it('should successfully perform optin', async () => {
      // Arrange
      const mockOptinResponse = {
        sessionId: 'session-456',
        subscription: {
          id: 'sub-789',
          referralCode: 'REF123',
          accounts: [],
        },
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptinResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.optin(mockOptinRequest);

      // Assert
      expect(result).toEqual(mockOptinResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockOptinRequest),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should handle optin without referral code', async () => {
      // Arrange
      const requestWithoutReferral = {
        challengeId: 'challenge-123',
        signature: '0xsignature123',
      };

      const mockOptinResponse = {
        sessionId: 'session-456',
        subscription: {
          id: 'sub-789',
          referralCode: 'AUTO123',
          accounts: [],
        },
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptinResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.optin(requestWithoutReferral);

      // Assert
      expect(result).toEqual(mockOptinResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestWithoutReferral),
        }),
      );
    });

    it('should handle optin errors', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 400,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.optin(mockOptinRequest)).rejects.toThrow(
        'Optin failed: 400',
      );
    });

    it('should handle network errors during optin', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.optin(mockOptinRequest)).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('logout', () => {
    const mockSubscriptionId = 'sub-123';

    beforeEach(() => {
      mockGetSubscriptionToken.mockResolvedValue({
        success: true,
        token: 'test-access-token',
      });
    });

    it('should successfully perform logout', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.logout(mockSubscriptionId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'omit',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should perform logout without subscription ID', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.logout();

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });

    it('should handle logout errors', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 401,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.logout(mockSubscriptionId)).rejects.toThrow(
        'Logout failed: 401',
      );
    });

    it('should handle network errors during logout', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.logout(mockSubscriptionId)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle missing subscription token gracefully', async () => {
      // Arrange
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.logout(mockSubscriptionId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/logout',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });
  });

  describe('fetchGeoLocation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully fetch geolocation in DEV environment', async () => {
      // Arrange
      const mockLocation = 'US';
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockLocation),
      };

      // Mock AppConstants to use DEV environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (AppConstants as any).IS_DEV = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.fetchGeoLocation();

      // Assert
      expect(result).toBe(mockLocation);
      expect(mockSuccessfulFetch).toHaveBeenCalledWith(
        'https://on-ramp.dev-api.cx.metamask.io/geolocation',
      );
    });

    it('should successfully fetch geolocation in PROD environment', async () => {
      // Arrange
      const mockLocation = 'US';
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockLocation),
      };

      // Mock AppConstants to use PROD environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (AppConstants as any).IS_DEV = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.fetchGeoLocation();

      // Assert
      expect(result).toBe(mockLocation);
      expect(mockSuccessfulFetch).toHaveBeenCalledWith(
        'https://on-ramp.api.cx.metamask.io/geolocation',
      );
    });

    it('should return UNKNOWN when geolocation request fails', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.fetchGeoLocation();

      // Assert
      expect(result).toBe('UNKNOWN');
    });

    it('should return UNKNOWN when network error occurs', async () => {
      // Arrange
      mockSuccessfulFetch.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await service.fetchGeoLocation();

      // Assert
      expect(result).toBe('UNKNOWN');
    });

    it('should return UNKNOWN when response text parsing fails', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        text: jest.fn().mockRejectedValue(new Error('Parse error')),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.fetchGeoLocation();

      // Assert
      expect(result).toBe('UNKNOWN');
    });

    it('should return location string from response', async () => {
      // Arrange
      const mockLocation = 'UK';
      const mockResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(mockLocation),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      // Act
      const result = await service.fetchGeoLocation();

      // Assert
      expect(result).toBe(mockLocation);
    });
  });

  describe('validateReferralCode', () => {
    it('should successfully validate a referral code', async () => {
      // Arrange
      const referralCode = 'ABC123';
      const mockValidationResponse = { valid: true };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockValidationResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.validateReferralCode(referralCode);

      // Assert
      expect(result).toEqual(mockValidationResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/referral/validate?code=ABC123',
        expect.objectContaining({
          method: 'GET',
          credentials: 'omit',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should return invalid response for invalid codes', async () => {
      // Arrange
      const referralCode = 'INVALID';
      const mockValidationResponse = { valid: false };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockValidationResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.validateReferralCode(referralCode);

      // Assert
      expect(result).toEqual(mockValidationResponse);
      expect(result.valid).toBe(false);
    });

    it('should properly encode special characters in referral code', async () => {
      // Arrange
      const referralCode = 'A+B/C=';
      const mockValidationResponse = { valid: true };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockValidationResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.validateReferralCode(referralCode);

      // Assert
      expect(result).toEqual(mockValidationResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/referral/validate?code=A%2BB%2FC%3D',
        expect.any(Object),
      );
    });

    it('should handle validation errors', async () => {
      // Arrange
      const referralCode = 'ABC123';
      const mockResponse = {
        ok: false,
        status: 400,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.validateReferralCode(referralCode)).rejects.toThrow(
        'Failed to validate referral code. Please try again shortly.',
      );
    });

    it('should handle network errors during validation', async () => {
      // Arrange
      const referralCode = 'ABC123';
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.validateReferralCode(referralCode)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle timeout errors during validation', async () => {
      // Arrange
      const referralCode = 'ABC123';
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      // Act & Assert
      await expect(service.validateReferralCode(referralCode)).rejects.toThrow(
        'Request timeout after 10000ms',
      );
    });
  });

  describe('getOptInStatus', () => {
    const mockOptInStatusRequest = {
      addresses: ['0x123456789', '0x987654321', '0xabcdefabc'],
    };

    const mockOptInStatusResponse = {
      ois: [true, false, true],
    };

    it('should successfully get opt-in status for multiple addresses', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptInStatusResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getOptInStatus(mockOptInStatusRequest);

      // Assert
      expect(result).toEqual(mockOptInStatusResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/public/rewards/ois',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockOptInStatusRequest),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should successfully handle single address', async () => {
      // Arrange
      const singleAddressRequest = {
        addresses: ['0x123456789'],
      };
      const singleAddressResponse = {
        ois: [true],
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(singleAddressResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getOptInStatus(singleAddressRequest);

      // Assert
      expect(result).toEqual(singleAddressResponse);
      expect(result.ois).toHaveLength(1);
      expect(result.ois[0]).toBe(true);
    });

    it('should handle all false opt-in status', async () => {
      // Arrange
      const allFalseResponse = {
        ois: [false, false, false],
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(allFalseResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getOptInStatus(mockOptInStatusRequest);

      // Assert
      expect(result).toEqual(allFalseResponse);
      expect(result.ois.every((status) => status === false)).toBe(true);
    });

    it('should handle mixed opt-in status results', async () => {
      // Arrange
      const mixedResponse = {
        ois: [true, false, true, false, true],
      };
      const mixedRequest = {
        addresses: ['0x1', '0x2', '0x3', '0x4', '0x5'],
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mixedResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getOptInStatus(mixedRequest);

      // Assert
      expect(result).toEqual(mixedResponse);
      expect(result.ois).toHaveLength(5);
      expect(result.ois[0]).toBe(true);
      expect(result.ois[1]).toBe(false);
      expect(result.ois[2]).toBe(true);
      expect(result.ois[3]).toBe(false);
      expect(result.ois[4]).toBe(true);
    });

    it('should throw error when addresses array is empty', async () => {
      // Arrange
      const emptyRequest = {
        addresses: [],
      };

      // Act & Assert
      await expect(service.getOptInStatus(emptyRequest)).rejects.toThrow(
        'Addresses are required',
      );
    });

    it('should throw error when addresses is null', async () => {
      // Arrange
      const nullRequest = {
        addresses: null as unknown as string[],
      };

      // Act & Assert
      await expect(service.getOptInStatus(nullRequest)).rejects.toThrow(
        'Addresses are required',
      );
    });

    it('should throw error when addresses exceeds maximum limit', async () => {
      // Arrange
      const tooManyAddresses = Array.from({ length: 501 }, (_, i) => `0x${i}`);
      const oversizedRequest = {
        addresses: tooManyAddresses,
      };

      // Act & Assert
      await expect(service.getOptInStatus(oversizedRequest)).rejects.toThrow(
        'Addresses must be less than 500',
      );
    });

    it('should handle exactly 500 addresses', async () => {
      // Arrange
      const maxAddresses = Array.from({ length: 500 }, (_, i) => `0x${i}`);
      const maxRequest = {
        addresses: maxAddresses,
      };
      const maxResponse = {
        ois: Array.from({ length: 500 }, (_, i) => i % 2 === 0),
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(maxResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getOptInStatus(maxRequest);

      // Assert
      expect(result).toEqual(maxResponse);
      expect(result.ois).toHaveLength(500);
    });

    it('should handle get opt-in status errors', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 400,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        service.getOptInStatus(mockOptInStatusRequest),
      ).rejects.toThrow('Get opt-in status failed: 400');
    });

    it('should handle server errors', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        service.getOptInStatus(mockOptInStatusRequest),
      ).rejects.toThrow('Get opt-in status failed: 500');
    });

    it('should handle network errors during fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        service.getOptInStatus(mockOptInStatusRequest),
      ).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      // Act & Assert
      await expect(
        service.getOptInStatus(mockOptInStatusRequest),
      ).rejects.toThrow('Request timeout after 10000ms');
    });

    it('should include proper headers in request', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptInStatusResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.getOptInStatus(mockOptInStatusRequest);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    // Arrange
    describe('getActivePointsBoosts', () => {
      it('should fetch active points boosts successfully', async () => {
        // Arrange
        const seasonId = 'season-123';
        const subscriptionId = 'sub-456';
        const mockToken = 'test-bearer-token';
        const mockBoostsResponse: PointsBoostEnvelopeDto = {
          boosts: [
            {
              id: 'boost-1',
              name: 'Test Boost 1',
              icon: {
                lightModeUrl: 'https://example.com/light1.png',
                darkModeUrl: 'https://example.com/dark1.png',
              },
              boostBips: 1000,
              seasonLong: true,
              backgroundColor: '#FF0000',
            },
            {
              id: 'boost-2',
              name: 'Test Boost 2',
              icon: {
                lightModeUrl: 'https://example.com/light2.png',
                darkModeUrl: 'https://example.com/dark2.png',
              },
              boostBips: 500,
              seasonLong: false,
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-01-31'),
              backgroundColor: '#00FF00',
            },
          ],
        };
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(mockBoostsResponse),
        } as unknown as Response;

        mockGetSubscriptionToken.mockResolvedValue({
          success: true,
          token: mockToken,
        });
        mockFetch.mockResolvedValue(mockResponse);

        // Act
        const result = await service.getActivePointsBoosts(
          seasonId,
          subscriptionId,
        );

        // Assert
        expect(mockGetSubscriptionToken).toHaveBeenCalledWith(subscriptionId);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.rewards.test/seasons/season-123/active-boosts',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Accept-Language': 'en-US',
              'Content-Type': 'application/json',
              'rewards-client-id': 'mobile-7.50.1',
            }),
            credentials: 'omit',
          }),
        );
        expect(result).toEqual(mockBoostsResponse);
        expect(result.boosts).toHaveLength(2);
        expect(result.boosts[0].id).toBe('boost-1');
        expect(result.boosts[1].seasonLong).toBe(false);
      });

      it('should return empty array when no boosts available', async () => {
        // Arrange
        const seasonId = 'season-123';
        const subscriptionId = 'sub-456';
        const mockToken = 'test-bearer-token';
        const mockEmptyResponse: PointsBoostEnvelopeDto = {
          boosts: [],
        };
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(mockEmptyResponse),
        } as unknown as Response;

        mockGetSubscriptionToken.mockResolvedValue({
          success: true,
          token: mockToken,
        });
        mockFetch.mockResolvedValue(mockResponse);

        // Act
        const result = await service.getActivePointsBoosts(
          seasonId,
          subscriptionId,
        );

        // Assert
        expect(result).toEqual(mockEmptyResponse);
        expect(result.boosts).toEqual([]);
        expect(result.boosts).toHaveLength(0);
      });

      it('should handle authentication errors', async () => {
        // Arrange
        const seasonId = 'season-123';
        const subscriptionId = 'sub-456';
        mockGetSubscriptionToken.mockRejectedValue(new Error('Auth failed'));

        // Act & Assert
        await expect(
          service.getActivePointsBoosts(seasonId, subscriptionId),
        ).rejects.toThrow('Cannot read properties of undefined');
      });
    });

    it('should include abort signal for timeout handling', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptInStatusResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.getOptInStatus(mockOptInStatusRequest);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  describe('optOut', () => {
    const mockSubscriptionId = 'subscription-123';
    const mockOptOutResponse = {
      success: true,
    };

    beforeEach(() => {
      mockGetSubscriptionToken.mockResolvedValue({
        success: true,
        token: 'test-access-token',
      });
    });

    it('should successfully opt out with valid subscription', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptOutResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.optOut(mockSubscriptionId);

      // Assert
      expect(result).toEqual(mockOptOutResponse);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/wr/subscriptions/opt-out',
        expect.objectContaining({
          method: 'POST',
          credentials: 'omit',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should include authentication headers with subscription token', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptOutResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.optOut(mockSubscriptionId);

      // Assert
      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'rewards-access-token': 'test-access-token',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });

    it('should handle opt-out failure from server', async () => {
      // Arrange
      const failureResponse = {
        success: false,
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(failureResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.optOut(mockSubscriptionId);

      // Assert
      expect(result).toEqual(failureResponse);
      expect(result.success).toBe(false);
    });

    it('should handle HTTP error responses', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.optOut(mockSubscriptionId)).rejects.toThrow(
        'Opt-out failed: 404',
      );
    });

    it('should handle unauthorized errors', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 401,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.optOut(mockSubscriptionId)).rejects.toThrow(
        'Opt-out failed: 401',
      );
    });

    it('should handle server errors', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.optOut(mockSubscriptionId)).rejects.toThrow(
        'Opt-out failed: 500',
      );
    });

    it('should handle network errors', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.optOut(mockSubscriptionId)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      // Act & Assert
      await expect(service.optOut(mockSubscriptionId)).rejects.toThrow(
        'Request timeout after 10000ms',
      );
    });

    it('should handle missing subscription token gracefully', async () => {
      // Arrange
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptOutResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.optOut(mockSubscriptionId);

      // Assert
      expect(result).toEqual(mockOptOutResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });

    it('should handle subscription token retrieval errors', async () => {
      // Arrange
      mockGetSubscriptionToken.mockRejectedValue(new Error('Token error'));

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptOutResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.optOut(mockSubscriptionId);

      // Assert
      expect(result).toEqual(mockOptOutResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });

    it('should include proper headers and credentials in request', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockOptOutResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.optOut(mockSubscriptionId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          credentials: 'omit',
          headers: expect.objectContaining({
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          }),
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should use correct API endpoint for different season IDs', async () => {
      // Arrange
      const seasonId = 'winter-2024';
      const subscriptionId = 'sub-789';
      const mockToken = 'test-bearer-token';
      const mockResponseData: PointsBoostEnvelopeDto = { boosts: [] };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseData),
      } as unknown as Response;

      mockGetSubscriptionToken.mockResolvedValue({
        success: true,
        token: mockToken,
      });
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.getActivePointsBoosts(seasonId, subscriptionId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/seasons/winter-2024/active-boosts',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          }),
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });
});
