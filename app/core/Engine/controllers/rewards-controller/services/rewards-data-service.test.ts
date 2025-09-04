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
import type { CaipAccountId } from '@metamask/utils';
import AppConstants from '../../../../AppConstants';

// Mock dependencies
jest.mock('../utils/multi-subscription-token-vault');
jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: 'https://api.rewards.test',
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
      token: 'test-bearer-token',
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
        'RewardsDataService:estimatePoints',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
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
            // Should not include rewards-api-key header
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
            'rewards-api-key': 'test-bearer-token',
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
            'rewards-api-key': 'test-bearer-token',
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
            'rewards-api-key': expect.any(String),
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
            'rewards-api-key': 'test-bearer-token',
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
            'rewards-api-key': 'test-bearer-token',
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
            'rewards-api-key': expect.any(String),
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
        service.getReferralDetails(mockSubscriptionId),
      ).rejects.toThrow('AbortError');
    });
  });

  const mockLoginResponse: LoginResponseDto = {
    sessionId: 'test-session-id',
    subscription: {
      id: 'test-subscription-id',
      referralCode: 'test-referral-code',
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
});
