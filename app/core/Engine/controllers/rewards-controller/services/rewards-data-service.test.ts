import {
  RewardsDataService,
  type RewardsDataServiceMessenger,
} from './rewards-data-service';
import type { LoginResponseDto, RewardsControllerState } from '../types';
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

  const mockRewardsState: RewardsControllerState = {
    lastAuthenticatedAccount: '0x123',
    lastAuthTime: Date.now(),
    subscription: {
      id: 'test-subscription-id',
      referralCode: 'test-referral-code',
    },
  };

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

    // Mock successful messenger call by default
    mockMessenger.call.mockImplementation(
      (actionType: string, ..._args: unknown[]) => {
        if (actionType === 'RewardsController:getState') {
          return mockRewardsState;
        }
        throw new Error(`Unexpected action: ${actionType}`);
      },
    );

    // Create service instance
    rewardsDataService = new RewardsDataService({
      messenger: mockMessenger,
      fetch: mockFetch,
    });
  });

  describe('constructor', () => {
    it('should register the mobileLogin action handler', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsDataService:mobileLogin',
        expect.any(Function),
      );
    });

    it('should store the messenger and fetch function', () => {
      // Test that the service was created without errors
      expect(rewardsDataService).toBeInstanceOf(RewardsDataService);
    });
  });

  describe('mobileLogin', () => {
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

    it('should successfully perform mobile login', async () => {
      const result = await rewardsDataService.mobileLogin(mockLoginBody);

      expect(result).toEqual(mockLoginResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${AppConstants.REWARDS_API_URL}/auth/mobile-login`,
        {
          credentials: 'omit',
          method: 'POST',
          body: JSON.stringify(mockLoginBody),
          headers: {
            'Content-Type': 'application/json',
            'rewards-api-key': 'test-bearer-token',
          },
        },
      );
    });

    it('should include bearer token when subscription exists', async () => {
      await rewardsDataService.mobileLogin(mockLoginBody);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsController:getState',
      );
      expect(mockGetSubscriptionToken).toHaveBeenCalledWith(
        'test-subscription-id',
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'rewards-api-key': 'test-bearer-token',
          }),
        }),
      );
    });

    it('should work without bearer token when subscription does not exist', async () => {
      // Mock state without subscription
      const stateWithoutSubscription: RewardsControllerState = {
        ...mockRewardsState,
        subscription: undefined,
      };
      mockMessenger.call.mockImplementation(
        (actionType: string, ..._args: unknown[]) => {
          if (actionType === 'RewardsController:getState') {
            return stateWithoutSubscription;
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      await rewardsDataService.mobileLogin(mockLoginBody);

      expect(mockGetSubscriptionToken).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should work without bearer token when token retrieval fails', async () => {
      mockGetSubscriptionToken.mockResolvedValue({
        success: false,
        error: 'Token not found',
      });

      await rewardsDataService.mobileLogin(mockLoginBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should continue without bearer token when messenger call fails', async () => {
      mockMessenger.call.mockRejectedValue(new Error('Messenger error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await rewardsDataService.mobileLogin(mockLoginBody);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to retrieve bearer token:',
        expect.any(Error),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        rewardsDataService.mobileLogin(mockLoginBody),
      ).rejects.toThrow('Mobile login failed: 401');
    });

    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(
        rewardsDataService.mobileLogin(mockLoginBody),
      ).rejects.toThrow('Network error');
    });

    it('should throw error when response parsing fails', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        rewardsDataService.mobileLogin(mockLoginBody),
      ).rejects.toThrow('Invalid JSON');
    });

    it('should merge custom headers with default headers', async () => {
      // This test verifies the makeRequest method's header merging behavior
      await rewardsDataService.mobileLogin(mockLoginBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'rewards-api-key': 'test-bearer-token',
          }),
        }),
      );
    });

    it('should use correct API endpoint', async () => {
      await rewardsDataService.mobileLogin(mockLoginBody);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.rewards.test/auth/mobile-login',
        expect.any(Object),
      );
    });

    it('should set credentials to omit', async () => {
      await rewardsDataService.mobileLogin(mockLoginBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'omit',
        }),
      );
    });
  });

  describe('action handler registration', () => {
    it('should bind the mobileLogin method correctly', async () => {
      // Get the registered handler function
      const registeredHandler = mockMessenger.registerActionHandler.mock
        .calls[0][1] as typeof rewardsDataService.mobileLogin;

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
