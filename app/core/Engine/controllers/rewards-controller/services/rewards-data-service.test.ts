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
import type { CaipAccountId } from '@metamask/utils';

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
      token: 'test-token',
    });

    service = new RewardsDataService({
      messenger: mockMessenger,
      fetch: mockFetch,
      appType: 'mobile',
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

    it('should register exactly 3 action handlers', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledTimes(3);
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
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-client-id': 'mobile-7.50.1',
          }),
        }),
      );
    });
  });
});
