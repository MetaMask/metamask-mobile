import {
  InvalidTimestampError,
  AuthorizationFailedError,
  AccountAlreadyRegisteredError,
  SeasonNotFoundError,
  RewardsDataService,
  type RewardsDataServiceMessenger,
} from './rewards-data-service';
import type {
  LoginResponseDto,
  EstimatePointsDto,
  EstimatedPointsDto,
  SeasonStateDto,
  SubscriptionSeasonReferralDetailsDto,
  PointsBoostEnvelopeDto,
  ClaimRewardDto,
  GetPointsEventsLastUpdatedDto,
  MobileLoginDto,
  MobileOptinDto,
  DiscoverSeasonsDto,
  SeasonMetadataDto,
} from '../types';
import { getSubscriptionToken } from '../utils/multi-subscription-token-vault';
import type { CaipAccountId } from '@metamask/utils';
import AppConstants from '../../../../AppConstants';
import { successfulFetch } from '@metamask/controller-utils';

// Mock dependencies
jest.mock('../utils/multi-subscription-token-vault');
jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: {
    DEV: 'https://api.rewards.test',
    UAT: 'https://api.rewards.test',
    PRD: 'https://api.rewards.test',
  },
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
        'RewardsDataService:mobileOptin',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:logout',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getSeasonStatus',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getReferralDetails',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:fetchGeoLocation',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:validateReferralCode',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:mobileJoin',
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
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getActivePointsBoosts',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getUnlockedRewards',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:claimReward',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getDiscoverSeasons',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:getSeasonMetadata',
        expect.any(Function),
      );
    });
  });

  // Test for mobileJoin function
  describe('mobileJoin', () => {
    const mockJoinRequest = {
      account: '0x123456789',
      timestamp: 1234567890,
      signature: '0xabcdef',
    };

    const mockSubscriptionId = 'test-subscription-id';

    const mockSubscriptionResponse = {
      id: 'test-subscription-id',
      referralCode: 'test-referral-code',
      accounts: [],
    };

    it('should successfully join an account to a subscription', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockSubscriptionResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.mobileJoin(
        mockJoinRequest as MobileLoginDto,
        mockSubscriptionId,
      );

      expect(result).toEqual(mockSubscriptionResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/wr/subscriptions/mobile-join',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockJoinRequest),
        }),
      );
    });

    it('should handle join errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ message: 'Join failed' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        service.mobileJoin(
          mockJoinRequest as MobileLoginDto,
          mockSubscriptionId,
        ),
      ).rejects.toThrow('Mobile join failed: 400 Join failed');
    });

    it('should throw InvalidTimestampError when server returns invalid timestamp error', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          message: 'Invalid timestamp',
          serverTimestamp: 1234567000000, // Server timestamp in milliseconds
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      try {
        await service.mobileJoin(
          mockJoinRequest as MobileLoginDto,
          mockSubscriptionId,
        );
        fail('Expected InvalidTimestampError to be thrown');
      } catch (error) {
        expect((error as InvalidTimestampError).name).toBe(
          'InvalidTimestampError',
        );
        expect((error as InvalidTimestampError).timestamp).toBe(1234567000); // Server timestamp in seconds
      }
    });

    it('throws AccountAlreadyRegisteredError when 409 response with already registered message', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 409,
        json: jest
          .fn()
          .mockResolvedValue({ message: 'Account is already registered' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      // Act & Assert
      try {
        await service.mobileJoin(
          mockJoinRequest as MobileLoginDto,
          mockSubscriptionId,
        );
        fail('Expected AccountAlreadyRegisteredError to be thrown');
      } catch (error) {
        expect((error as AccountAlreadyRegisteredError).name).toBe(
          'AccountAlreadyRegisteredError',
        );
        expect((error as AccountAlreadyRegisteredError).message).toBe(
          'Account is already registered',
        );
      }
    });

    it('throws AccountAlreadyRegisteredError when 409 response with lowercase already registered message', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 409,
        json: jest.fn().mockResolvedValue({
          message: 'User is already registered with this account',
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      // Act & Assert
      try {
        await service.mobileJoin(
          mockJoinRequest as MobileLoginDto,
          mockSubscriptionId,
        );
        fail('Expected AccountAlreadyRegisteredError to be thrown');
      } catch (error) {
        expect((error as AccountAlreadyRegisteredError).name).toBe(
          'AccountAlreadyRegisteredError',
        );
        expect((error as AccountAlreadyRegisteredError).message).toBe(
          'User is already registered with this account',
        );
      }
    });

    it('throws generic error when 409 response without already registered message', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 409,
        json: jest.fn().mockResolvedValue({ message: 'Conflict error' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      // Act & Assert
      await expect(
        service.mobileJoin(
          mockJoinRequest as MobileLoginDto,
          mockSubscriptionId,
        ),
      ).rejects.toThrow('Mobile join failed: 409 Conflict error');
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
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
      } as unknown as Response;
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

    it('should throw InvalidTimestampError when server returns invalid timestamp error', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          message: 'Invalid timestamp',
          serverTimestamp: 1234567000000, // Server timestamp in milliseconds
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      try {
        await service.login(mockLoginRequest);
        fail('Expected InvalidTimestampError to be thrown');
      } catch (error) {
        expect((error as InvalidTimestampError).name).toBe(
          'InvalidTimestampError',
        );
        expect((error as InvalidTimestampError).timestamp).toBe(1234567000); // Server timestamp in seconds
      }
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

  describe('getPointsEventsLastUpdated', () => {
    const mockGetPointsEventsLastUpdatedRequest: GetPointsEventsLastUpdatedDto =
      {
        seasonId: 'current',
        subscriptionId: 'sub-123',
      };

    it('should successfully get points events last updated timestamp', async () => {
      // Arrange
      const mockLastUpdatedResponse = {
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLastUpdatedResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getPointsEventsLastUpdated(
        mockGetPointsEventsLastUpdatedRequest,
      );

      // Assert
      expect(result).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/seasons/current/points-events/last-updated',
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

    it('should return null when lastUpdated is not present in response', async () => {
      // Arrange
      const mockResponseWithoutLastUpdated = {};
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseWithoutLastUpdated),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getPointsEventsLastUpdated(
        mockGetPointsEventsLastUpdatedRequest,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should include authentication headers with subscription token', async () => {
      // Arrange
      const mockLastUpdatedResponse = {
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLastUpdatedResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.getPointsEventsLastUpdated(
        mockGetPointsEventsLastUpdatedRequest,
      );

      // Assert
      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(
        mockGetPointsEventsLastUpdatedRequest.subscriptionId,
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
      // Arrange
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const mockLastUpdatedResponse = {
        lastUpdated: '2024-01-01T10:00:00Z',
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockLastUpdatedResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getPointsEventsLastUpdated(
        mockGetPointsEventsLastUpdatedRequest,
      );

      // Assert
      expect(result).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });

    it('should handle get points events last updated errors', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        service.getPointsEventsLastUpdated(
          mockGetPointsEventsLastUpdatedRequest,
        ),
      ).rejects.toThrow('Get points events last update failed: 404');
    });

    it('should handle network errors', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        service.getPointsEventsLastUpdated(
          mockGetPointsEventsLastUpdatedRequest,
        ),
      ).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      // Act & Assert
      await expect(
        service.getPointsEventsLastUpdated(
          mockGetPointsEventsLastUpdatedRequest,
        ),
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
        text: jest.fn().mockResolvedValue('1,550'),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getPerpsDiscount({
        account: testAddress as CaipAccountId,
      });

      expect(result).toEqual({
        hasOptedIn: true,
        discountBips: 550,
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
        text: jest.fn().mockResolvedValue('0,1000'),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getPerpsDiscount({
        account: testAddress as CaipAccountId,
      });

      expect(result).toEqual({
        hasOptedIn: false,
        discountBips: 1000,
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

  const mockSeasonStateResponse: SeasonStateDto = {
    balance: 1000,
    currentTierId: 'tier-gold',
    updatedAt: new Date('2023-12-01T10:00:00Z'),
  };

  describe('getSeasonStatus', () => {
    const mockSeasonId = 'season-123';
    const mockSubscriptionId = 'subscription-456';

    beforeEach(() => {
      // Mock successful fetch response for season state
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          balance: mockSeasonStateResponse.balance,
          currentTierId: mockSeasonStateResponse.currentTierId,
          updatedAt: '2023-12-01T10:00:00Z', // API returns string, not Date
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('fetches season state from the correct endpoint', async () => {
      const result = await service.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      expect(result).toEqual(mockSeasonStateResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${AppConstants.REWARDS_API_URL.DEV}/seasons/${mockSeasonId}/state`,
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

    it('converts updatedAt string to Date object', async () => {
      const result = await service.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.getTime()).toBe(
        new Date('2023-12-01T10:00:00Z').getTime(),
      );
    });

    it('includes authentication headers with subscription token', async () => {
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

    it('throws error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: 'Not found' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        service.getSeasonStatus(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Get season state failed: 404');
    });

    it('throws AuthorizationFailedError when rewards authorization fails', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          message: 'Rewards authorization failed',
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      let caughtError: unknown;
      try {
        await service.getSeasonStatus(mockSeasonId, mockSubscriptionId);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(AuthorizationFailedError);
      const authError = caughtError as AuthorizationFailedError;
      expect(authError.name).toBe('AuthorizationFailedError');
      expect(authError.message).toBe(
        'Rewards authorization failed. Please login and try again.',
      );
    });

    it('detects authorization failure when message contains the phrase', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValue({
          message:
            'Some other error: Rewards authorization failed due to expiry',
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        service.getSeasonStatus(mockSeasonId, mockSubscriptionId),
      ).rejects.toBeInstanceOf(AuthorizationFailedError);
    });

    it('throws SeasonNotFoundError when season is not found', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          message: 'Season not found',
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      let caughtError: unknown;
      try {
        await service.getSeasonStatus(mockSeasonId, mockSubscriptionId);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(SeasonNotFoundError);
      const seasonNotFoundError = caughtError as SeasonNotFoundError;
      expect(seasonNotFoundError.name).toBe('SeasonNotFoundError');
      expect(seasonNotFoundError.message).toBe(
        'Season not found. Please try again with a different season.',
      );
    });

    it('detects season not found when message contains the phrase', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          message: 'The requested Season not found in the system',
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        service.getSeasonStatus(mockSeasonId, mockSubscriptionId),
      ).rejects.toBeInstanceOf(SeasonNotFoundError);
    });

    it('throws error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(
        service.getSeasonStatus(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Network error');
    });

    it('handles missing subscription token gracefully', async () => {
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const result = await service.getSeasonStatus(
        mockSeasonId,
        mockSubscriptionId,
      );

      expect(result).toEqual(mockSeasonStateResponse);
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

  describe('getDiscoverSeasons', () => {
    const mockDiscoverSeasonsResponse: DiscoverSeasonsDto = {
      previous: null,
      current: {
        id: '7444682d-9050-43b8-9038-28a6a62d6264',
        startDate: new Date('2025-09-01T04:00:00.000Z'),
        endDate: new Date('2025-11-30T04:00:00.000Z'),
      },
      next: null,
    };

    beforeEach(() => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          previous: null,
          current: {
            id: mockDiscoverSeasonsResponse.current?.id,
            startDate: '2025-09-01T04:00:00.000Z',
            endDate: '2025-11-30T04:00:00.000Z',
          },
          next: null,
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('fetches discover seasons from the correct public endpoint', async () => {
      const result = await service.getDiscoverSeasons();

      expect(result).toEqual(mockDiscoverSeasonsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${AppConstants.REWARDS_API_URL.DEV}/public/seasons/status`,
        {
          credentials: 'omit',
          method: 'GET',
          headers: {
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          },
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('converts date strings to Date objects for previous season', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          previous: {
            id: '6333571c-8049-32a7-8027-17a5a51c5153',
            startDate: '2025-06-01T04:00:00.000Z',
            endDate: '2025-08-31T04:00:00.000Z',
          },
          current: null,
          next: null,
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getDiscoverSeasons();

      expect(result.previous?.startDate).toBeInstanceOf(Date);
      expect(result.previous?.startDate.getTime()).toBe(
        new Date('2025-06-01T04:00:00.000Z').getTime(),
      );
      expect(result.previous?.endDate).toBeInstanceOf(Date);
      expect(result.previous?.endDate.getTime()).toBe(
        new Date('2025-08-31T04:00:00.000Z').getTime(),
      );
    });

    it('converts date strings to Date objects for current season', async () => {
      const result = await service.getDiscoverSeasons();

      expect(result.current?.startDate).toBeInstanceOf(Date);
      expect(result.current?.startDate.getTime()).toBe(
        new Date('2025-09-01T04:00:00.000Z').getTime(),
      );
      expect(result.current?.endDate).toBeInstanceOf(Date);
      expect(result.current?.endDate.getTime()).toBe(
        new Date('2025-11-30T04:00:00.000Z').getTime(),
      );
    });

    it('handles response with previous, current and next seasons', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          previous: {
            id: '6333571c-8049-32a7-8027-17a5a51c5153',
            startDate: '2025-06-01T04:00:00.000Z',
            endDate: '2025-08-31T04:00:00.000Z',
          },
          current: {
            id: '7444682d-9050-43b8-9038-28a6a62d6264',
            startDate: '2025-09-01T04:00:00.000Z',
            endDate: '2025-11-30T04:00:00.000Z',
          },
          next: {
            id: '8555793e-0161-54c9-0149-39b7b73e7375',
            startDate: '2025-12-01T04:00:00.000Z',
            endDate: '2026-02-28T04:00:00.000Z',
          },
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getDiscoverSeasons();

      expect(result.previous).not.toBeNull();
      expect(result.previous?.id).toBe('6333571c-8049-32a7-8027-17a5a51c5153');
      expect(result.previous?.startDate).toBeInstanceOf(Date);
      expect(result.previous?.endDate).toBeInstanceOf(Date);
      expect(result.current).not.toBeNull();
      expect(result.next).not.toBeNull();
      expect(result.next?.id).toBe('8555793e-0161-54c9-0149-39b7b73e7375');
      expect(result.next?.startDate).toBeInstanceOf(Date);
      expect(result.next?.endDate).toBeInstanceOf(Date);
    });

    it('handles response with null previous, current and next seasons', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          previous: null,
          current: null,
          next: null,
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.getDiscoverSeasons();

      expect(result.previous).toBeNull();
      expect(result.current).toBeNull();
      expect(result.next).toBeNull();
    });

    it('throws error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ message: 'Server error' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.getDiscoverSeasons()).rejects.toThrow(
        'Get discover seasons failed: 500',
      );
    });

    it('throws error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(service.getDiscoverSeasons()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('getSeasonMetadata', () => {
    const mockSeasonId = '7444682d-9050-43b8-9038-28a6a62d6264';
    const mockSeasonMetadataResponse: SeasonMetadataDto = {
      id: mockSeasonId,
      name: 'Season 1',
      startDate: new Date('2025-09-01T04:00:00.000Z'),
      endDate: new Date('2025-11-30T04:00:00.000Z'),
      tiers: [
        {
          id: 'tier-bronze',
          name: 'Bronze Tier',
          pointsNeeded: 0,
          image: {
            lightModeUrl: 'https://example.com/bronze-light.png',
            darkModeUrl: 'https://example.com/bronze-dark.png',
          },
          levelNumber: '1',
          rewards: [],
        },
        {
          id: 'tier-silver',
          name: 'Silver Tier',
          pointsNeeded: 500,
          image: {
            lightModeUrl: 'https://example.com/silver-light.png',
            darkModeUrl: 'https://example.com/silver-dark.png',
          },
          levelNumber: '2',
          rewards: [],
        },
      ],
      activityTypes: [],
    };

    beforeEach(() => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: mockSeasonMetadataResponse.id,
          name: mockSeasonMetadataResponse.name,
          startDate: '2025-09-01T04:00:00.000Z',
          endDate: '2025-11-30T04:00:00.000Z',
          tiers: mockSeasonMetadataResponse.tiers,
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('fetches season metadata from the correct public endpoint', async () => {
      const result = await service.getSeasonMetadata(mockSeasonId);

      expect(result).toEqual(mockSeasonMetadataResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${AppConstants.REWARDS_API_URL.DEV}/public/seasons/${mockSeasonId}/meta`,
        {
          credentials: 'omit',
          method: 'GET',
          headers: {
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          },
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('converts date strings to Date objects', async () => {
      const result = await service.getSeasonMetadata(mockSeasonId);

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.startDate.getTime()).toBe(
        new Date('2025-09-01T04:00:00.000Z').getTime(),
      );
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.endDate.getTime()).toBe(
        new Date('2025-11-30T04:00:00.000Z').getTime(),
      );
    });

    it('includes tiers in the response', async () => {
      const result = await service.getSeasonMetadata(mockSeasonId);

      expect(result.tiers).toHaveLength(2);
      expect(result.tiers[0].id).toBe('tier-bronze');
      expect(result.tiers[0].name).toBe('Bronze Tier');
      expect(result.tiers[1].id).toBe('tier-silver');
      expect(result.tiers[1].name).toBe('Silver Tier');
    });

    it('throws error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: 'Season not found' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.getSeasonMetadata(mockSeasonId)).rejects.toThrow(
        'Get season metadata failed: 404',
      );
    });

    it('throws error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(service.getSeasonMetadata(mockSeasonId)).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('getReferralDetails', () => {
    const mockSubscriptionId = 'test-subscription-123';
    const mockSeasonId = 'test-season-456';

    const mockReferralDetailsResponse: SubscriptionSeasonReferralDetailsDto = {
      referralCode: 'TEST123',
      totalReferees: 5,
      referralPoints: 100,
    };

    beforeEach(() => {
      // Mock successful response for each test
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockReferralDetailsResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('gets referral details for a season', async () => {
      const result = await service.getReferralDetails(
        mockSeasonId,
        mockSubscriptionId,
      );

      expect(result).toEqual(mockReferralDetailsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.rewards.test/seasons/${mockSeasonId}/referral-details`,
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

    it('includes subscription ID in token retrieval', async () => {
      await service.getReferralDetails(mockSeasonId, mockSubscriptionId);

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

    it('throws error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        service.getReferralDetails(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Get referral details failed: 404');
    });

    it('throws error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(
        service.getReferralDetails(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Network error');
    });

    it('handles missing subscription token gracefully', async () => {
      // Mock token retrieval failure
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        token: undefined,
      });

      const result = await service.getReferralDetails(
        mockSeasonId,
        mockSubscriptionId,
      );

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

    it('handles subscription token retrieval error', async () => {
      // Mock token retrieval throwing an error
      mockGetSubscriptionToken.mockRejectedValue(new Error('Token error'));

      const result = await service.getReferralDetails(
        mockSeasonId,
        mockSubscriptionId,
      );

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

    it('handles timeout correctly', async () => {
      // Mock fetch that never resolves (simulate timeout)
      mockFetch.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 100);
          }),
      );

      await expect(
        service.getReferralDetails(mockSeasonId, mockSubscriptionId),
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
      account: '0x123',
      timestamp: 1234567890,
      signature: '0xsignature123',
      referralCode: 'REF123',
    } as MobileOptinDto;

    const mockSolanaOptinRequest = {
      account: '0x123',
      timestamp: 1234567890,
      signature: '0xsignature123',
      referralCode: 'REF123',
    } as MobileOptinDto;

    it('should successfully perform optin for EVM accounts', async () => {
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
      const result = await service.mobileOptin(mockOptinRequest);

      // Assert
      expect(result).toEqual(mockOptinResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-optin',
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

    it('should successfully perform optin for Solana accounts', async () => {
      // Arrange
      const mockOptinResponse = {
        sessionId: 'session-456',
        subscription: {
          id: 'sol-789',
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
      const result = await service.mobileOptin(mockSolanaOptinRequest);

      // Assert
      expect(result).toEqual(mockOptinResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-optin',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockSolanaOptinRequest),
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
        account: '0x123',
        timestamp: 1234567890,
        signature: '0xsignature123',
      } as MobileOptinDto;

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
      const result = await service.mobileOptin(requestWithoutReferral);

      // Assert
      expect(result).toEqual(mockOptinResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-optin',
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
        json: jest.fn().mockResolvedValue({ message: 'Bad request' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.mobileOptin(mockOptinRequest)).rejects.toThrow(
        'Optin failed: 400',
      );
    });

    it('should throw InvalidTimestampError when server returns invalid timestamp error during mobileOptin', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          message: 'Invalid timestamp',
          serverTimestamp: 1234567000000, // Server timestamp in milliseconds
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      // Act & Assert
      try {
        await service.mobileOptin(mockOptinRequest);
        fail('Expected InvalidTimestampError to be thrown');
      } catch (error) {
        expect((error as InvalidTimestampError).name).toBe(
          'InvalidTimestampError',
        );
        expect((error as InvalidTimestampError).timestamp).toBe(1234567000); // Server timestamp in seconds
      }
    });

    it('throws AccountAlreadyRegisteredError when 409 response with already registered message', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 409,
        json: jest
          .fn()
          .mockResolvedValue({ message: 'Account is already registered' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      // Act & Assert
      try {
        await service.mobileOptin(mockOptinRequest);
        fail('Expected AccountAlreadyRegisteredError to be thrown');
      } catch (error) {
        expect((error as AccountAlreadyRegisteredError).name).toBe(
          'AccountAlreadyRegisteredError',
        );
        expect((error as AccountAlreadyRegisteredError).message).toBe(
          'Account is already registered',
        );
      }
    });

    it('throws AccountAlreadyRegisteredError when 409 response with uppercase already registered message', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 409,
        json: jest.fn().mockResolvedValue({
          message: 'User is ALREADY REGISTERED with this account',
        }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      // Act & Assert
      try {
        await service.mobileOptin(mockOptinRequest);
        fail('Expected AccountAlreadyRegisteredError to be thrown');
      } catch (error) {
        expect((error as AccountAlreadyRegisteredError).name).toBe(
          'AccountAlreadyRegisteredError',
        );
        expect((error as AccountAlreadyRegisteredError).message).toBe(
          'User is ALREADY REGISTERED with this account',
        );
      }
    });

    it('throws generic error when 409 response without already registered message', async () => {
      // Arrange
      const mockErrorResponse = {
        ok: false,
        status: 409,
        json: jest.fn().mockResolvedValue({ message: 'Conflict error' }),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockErrorResponse);

      // Act & Assert
      await expect(service.mobileOptin(mockOptinRequest)).rejects.toThrow(
        'Optin failed: 409',
      );
    });

    it('should handle network errors during optin', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.mobileOptin(mockOptinRequest)).rejects.toThrow(
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

    it('should successfully fetch geolocation using PROD URL', async () => {
      // Arrange
      const mockLocation = 'US';
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
      expect(mockSuccessfulFetch).toHaveBeenCalledWith(
        'https://on-ramp.api.cx.metamask.io/geolocation',
      );
    });

    it('should always use PROD geolocation URL regardless of environment', async () => {
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
      // Always uses PROD URL, not DEV
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
      sids: ['sub_123', null, 'sub_456'],
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
        sids: ['sub_123'],
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
              startDate: '2024-01-01',
              endDate: '2024-01-31',
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

  describe('getUnlockedRewards', () => {
    const mockSeasonId = 'season-123';
    const mockSubscriptionId = 'sub-456';
    const mockToken = 'test-bearer-token';

    const mockUnlockedRewardsResponse = [
      {
        id: 'reward-1',
        seasonRewardId: 'season-reward-1',
        claimStatus: 'CLAIMED' as const,
      },
      {
        id: 'reward-2',
        seasonRewardId: 'season-reward-2',
        claimStatus: 'UNCLAIMED' as const,
      },
    ];

    beforeEach(() => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockUnlockedRewardsResponse),
      } as unknown as Response;
      mockGetSubscriptionToken.mockResolvedValue({
        success: true,
        token: mockToken,
      });
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should successfully get unlocked rewards', async () => {
      // Act
      const result = await service.getUnlockedRewards(
        mockSeasonId,
        mockSubscriptionId,
      );

      // Assert
      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/rewards?seasonId=season-123',
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
      expect(result).toEqual(mockUnlockedRewardsResponse);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('reward-1');
      expect(result[0].claimStatus).toBe('CLAIMED');
      expect(result[1].claimStatus).toBe('UNCLAIMED');
    });

    it('should handle empty rewards array', async () => {
      // Arrange
      const emptyResponse: never[] = [];
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(emptyResponse),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getUnlockedRewards(
        mockSeasonId,
        mockSubscriptionId,
      );

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error when response is not ok', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        service.getUnlockedRewards(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Failed to get unlocked: 404');
    });

    it('should throw error when response is 500', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        service.getUnlockedRewards(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Failed to get unlocked: 500');
    });

    it('should throw error when fetch fails', async () => {
      // Arrange
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      // Act & Assert
      await expect(
        service.getUnlockedRewards(mockSeasonId, mockSubscriptionId),
      ).rejects.toThrow('Network error');
    });

    it('should handle different season IDs correctly', async () => {
      // Arrange
      const differentSeasonId = 'current';

      // Act
      await service.getUnlockedRewards(differentSeasonId, mockSubscriptionId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/rewards?seasonId=current',
        expect.any(Object),
      );
    });

    it('should include subscription token in authentication', async () => {
      // Act
      await service.getUnlockedRewards(mockSeasonId, mockSubscriptionId);

      // Assert
      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'rewards-client-id': 'mobile-7.50.1',
          }),
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

  describe('claimReward', () => {
    const mockRewardId = 'reward-123';
    const mockSubscriptionId = 'sub-456';
    const mockToken = 'test-access-token';

    beforeEach(() => {
      mockGetSubscriptionToken.mockResolvedValue({
        success: true,
        token: mockToken,
      });
    });

    it('should successfully claim reward without DTO', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.claimReward(mockRewardId, mockSubscriptionId);

      // Assert
      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/wr/rewards/reward-123/claim',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(undefined),
          headers: expect.objectContaining({
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
            'rewards-access-token': mockToken,
          }),
          credentials: 'omit',
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should successfully claim reward with DTO', async () => {
      // Arrange
      const mockDto: ClaimRewardDto = {
        data: {
          telegramHandle: '@testuser',
          email: 'test@example.com',
        },
      };
      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.claimReward(mockRewardId, mockSubscriptionId, mockDto);

      // Assert
      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(mockSubscriptionId);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/wr/rewards/reward-123/claim',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockDto),
          headers: expect.objectContaining({
            'Accept-Language': 'en-US',
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
            'rewards-access-token': mockToken,
          }),
          credentials: 'omit',
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should handle empty DTO object', async () => {
      // Arrange
      const emptyDto = {};
      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.claimReward(mockRewardId, mockSubscriptionId, emptyDto);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/wr/rewards/reward-123/claim',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(emptyDto),
        }),
      );
    });

    it('should throw error when response is not ok', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 400,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        service.claimReward(mockRewardId, mockSubscriptionId),
      ).rejects.toThrow('Failed to claim reward: 400');
    });

    it('should throw error when response is 404', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 404,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        service.claimReward(mockRewardId, mockSubscriptionId),
      ).rejects.toThrow('Failed to claim reward: 404');
    });

    it('should throw error when response is 500', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(
        service.claimReward(mockRewardId, mockSubscriptionId),
      ).rejects.toThrow('Failed to claim reward: 500');
    });

    it('should throw error when fetch fails', async () => {
      // Arrange
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      // Act & Assert
      await expect(
        service.claimReward(mockRewardId, mockSubscriptionId),
      ).rejects.toThrow('Network error');
    });

    it('should handle subscription token retrieval errors', async () => {
      // Arrange
      mockGetSubscriptionToken.mockRejectedValue(new Error('Token error'));
      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.claimReward(mockRewardId, mockSubscriptionId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'rewards-access-token': expect.any(String),
          }),
        }),
      );
    });

    it('should handle different reward IDs correctly', async () => {
      // Arrange
      const differentRewardId = 'special-reward-789';
      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.claimReward(differentRewardId, mockSubscriptionId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/wr/rewards/special-reward-789/claim',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should include proper headers and credentials in request', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await service.claimReward(mockRewardId, mockSubscriptionId);

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
  });
});
