/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  RewardsController,
  getRewardsControllerDefaultState,
} from './RewardsController';
import type { RewardsControllerMessenger } from '../../messengers/rewards-controller-messenger';
import type {
  RewardsAccountState,
  RewardsControllerState,
  SeasonStatusState,
  SeasonTierDto,
  SeasonDtoState,
  SubscriptionReferralDetailsState,
} from './types';
import type { CaipAccountId } from '@metamask/utils';

// Mock dependencies
jest.mock('./utils/multi-subscription-token-vault', () => ({
  ...jest.requireActual('./utils/multi-subscription-token-vault'),
  storeSubscriptionToken: jest.fn().mockResolvedValue(undefined),
  removeSubscriptionToken: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('../../../../util/Logger');
jest.mock('../../../../selectors/featureFlagController/rewards');
jest.mock('../../../../store');
jest.mock('../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));
jest.mock('@solana/addresses', () => ({
  isAddress: jest.fn(),
}));
jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  toHex: jest.fn(),
}));

// Import mocked modules
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { store } from '../../../../store';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isHardwareAccount } from '../../../../util/address';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { toHex } from '@metamask/controller-utils';
import Logger from '../../../../util/Logger';
import {
  storeSubscriptionToken,
  removeSubscriptionToken,
} from './utils/multi-subscription-token-vault';

// Type the mocked modules
const mockSelectRewardsEnabledFlag =
  selectRewardsEnabledFlag as jest.MockedFunction<
    typeof selectRewardsEnabledFlag
  >;
const mockStore = store as jest.Mocked<typeof store>;
const mockIsHardwareAccount = isHardwareAccount as jest.MockedFunction<
  typeof isHardwareAccount
>;
const mockIsSolanaAddress = isSolanaAddress as jest.MockedFunction<
  typeof isSolanaAddress
>;
const mockToHex = toHex as jest.MockedFunction<typeof toHex>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockStoreSubscriptionToken =
  storeSubscriptionToken as jest.MockedFunction<typeof storeSubscriptionToken>;
const mockRemoveSubscriptionToken =
  removeSubscriptionToken as jest.MockedFunction<
    typeof removeSubscriptionToken
  >;

// Test constants - CAIP-10 format addresses
const CAIP_ACCOUNT_1: CaipAccountId = 'eip155:1:0x123' as CaipAccountId;
const CAIP_ACCOUNT_2: CaipAccountId = 'eip155:1:0x456' as CaipAccountId;
const CAIP_ACCOUNT_3: CaipAccountId = 'eip155:1:0x789' as CaipAccountId;

// Helper function to create test tier data
const createTestTiers = (): SeasonTierDto[] => [
  { id: 'bronze', name: 'Bronze', pointsNeeded: 0 },
  { id: 'silver', name: 'Silver', pointsNeeded: 1000 },
  { id: 'gold', name: 'Gold', pointsNeeded: 5000 },
  { id: 'platinum', name: 'Platinum', pointsNeeded: 10000 },
];

// Helper function to create test season status (API response format with Date objects)
const createTestSeasonStatus = (
  overrides: Partial<{
    season: Partial<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      tiers: SeasonTierDto[];
    }>;
    balance: Partial<{
      total: number;
      refereePortion: number;
      updatedAt: Date;
    }>;
    currentTierId: string;
  }> = {},
) => {
  const defaultSeason = {
    id: 'season123',
    name: 'Test Season',
    startDate: new Date(Date.now() - 86400000), // 1 day ago
    endDate: new Date(Date.now() + 86400000), // 1 day from now
    tiers: createTestTiers(),
  };

  const defaultBalance = {
    total: 1500,
    refereePortion: 300,
    updatedAt: new Date(),
  };

  return {
    season: {
      ...defaultSeason,
      ...overrides.season,
    },
    balance: {
      ...defaultBalance,
      ...overrides.balance,
    },
    currentTierId: overrides.currentTierId || 'silver',
  };
};

describe('RewardsController', () => {
  let mockMessenger: jest.Mocked<RewardsControllerMessenger>;
  let controller: RewardsController;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMessenger = {
      subscribe: jest.fn(),
      call: jest.fn(),
      registerActionHandler: jest.fn(),
      unregisterActionHandler: jest.fn(),
      publish: jest.fn(),
      clearEventSubscriptions: jest.fn(),
      registerInitialEventPayload: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<RewardsControllerMessenger>;

    // Reset feature flag to enabled by default
    mockSelectRewardsEnabledFlag.mockReturnValue(true);

    controller = new RewardsController({
      messenger: mockMessenger,
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      expect(controller.state).toEqual(getRewardsControllerDefaultState());
    });

    it('should register action handlers', () => {
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsController:getHasAccountOptedIn',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsController:getPointsEvents',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsController:estimatePoints',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsController:getPerpsDiscountForAccount',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsController:isRewardsFeatureEnabled',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsController:getSeasonStatus',
        expect.any(Function),
      );
      expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
        'RewardsController:getReferralDetails',
        expect.any(Function),
      );
    });

    it('should subscribe to account change events', () => {
      expect(mockMessenger.subscribe).toHaveBeenCalledWith(
        'AccountsController:selectedAccountChange',
        expect.any(Function),
      );
    });

    it('should subscribe to keyring unlock events', () => {
      expect(mockMessenger.subscribe).toHaveBeenCalledWith(
        'KeyringController:unlock',
        expect.any(Function),
      );
    });
  });

  describe('state management', () => {
    it('should reset state to default', () => {
      // Set some initial state
      const initialState: Partial<RewardsControllerState> = {
        activeAccount: {
          account: CAIP_ACCOUNT_1,
          hasOptedIn: true,
          subscriptionId: 'test',
          lastCheckedAuth: Date.now(),
          lastCheckedAuthError: false,
          perpsFeeDiscount: 5.0,
          lastPerpsDiscountRateFetched: Date.now(),
        },
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: initialState,
      });

      controller.resetState();

      expect(controller.state).toEqual(getRewardsControllerDefaultState());
    });

    it('should manage account state correctly', () => {
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: null,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
        },
      });

      // Verify state was set correctly
      expect(controller.state.accounts[CAIP_ACCOUNT_1]).toEqual(accountState);
      expect(controller.state.accounts[CAIP_ACCOUNT_2]).toBeUndefined();
    });
  });

  describe('getHasAccountOptedIn', () => {
    beforeEach(() => {
      // Mock feature flag to be enabled by default for existing tests
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return false when feature flag is disabled', async () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_1);

      expect(result).toBe(false);
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        expect.anything(),
      );
    });

    it('should return cached hasOptedIn value when cache is fresh', async () => {
      const recentTime = Date.now() - 60000; // 1 minute ago
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: true,
        subscriptionId: 'test',
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 5.0,
        lastPerpsDiscountRateFetched: recentTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
        },
      });

      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_1);

      expect(result).toBe(true);
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        expect.anything(),
      );
    });

    it('should return false from cached data when account has not opted in', async () => {
      const recentTime = Date.now() - 60000; // 1 minute ago
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: recentTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
        },
      });

      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_1);

      expect(result).toBe(false);
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        expect.anything(),
      );
    });

    it('should fetch fresh data when cache is stale', async () => {
      const staleTime = Date.now() - 600000; // 10 minutes ago (stale)
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: staleTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
        },
      });

      mockMessenger.call.mockResolvedValue({
        hasOptedIn: true,
        discount: 5.0,
      });

      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_1);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        { account: CAIP_ACCOUNT_1 },
      );
      expect(result).toBe(true);
    });

    it('should update store state with new hasOptedIn value when fetching fresh data', async () => {
      const staleTime = Date.now() - 600000; // 10 minutes ago (stale)
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: staleTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
        },
      });

      mockMessenger.call.mockResolvedValue({
        hasOptedIn: true,
        discount: 8.5,
      });

      // Act
      await controller.getHasAccountOptedIn(CAIP_ACCOUNT_1);

      // Assert - verify state has been updated
      const updatedAccountState = controller.state.accounts[CAIP_ACCOUNT_1];
      expect(updatedAccountState).toBeDefined();
      expect(updatedAccountState.hasOptedIn).toBe(true);
      expect(updatedAccountState.perpsFeeDiscount).toBe(8.5);
      expect(updatedAccountState.lastPerpsDiscountRateFetched).toBeGreaterThan(
        staleTime,
      );
    });

    it('should update store state when creating new account on first opt-in check', async () => {
      mockMessenger.call.mockResolvedValue({
        hasOptedIn: true,
        discount: 12.0,
      });

      // Act - check account that doesn't exist in state
      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_2);

      // Assert - verify new account state was created
      expect(result).toBe(true);
      const newAccountState = controller.state.accounts[CAIP_ACCOUNT_2];
      expect(newAccountState).toBeDefined();
      expect(newAccountState.account).toBe(CAIP_ACCOUNT_2);
      expect(newAccountState.hasOptedIn).toBe(true);
      expect(newAccountState.perpsFeeDiscount).toBe(12.0);
      expect(newAccountState.subscriptionId).toBeNull();
      expect(newAccountState.lastPerpsDiscountRateFetched).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it('should call data service for unknown accounts', async () => {
      mockMessenger.call.mockResolvedValue({
        hasOptedIn: false,
        discount: 5.0,
      });

      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_2);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        { account: CAIP_ACCOUNT_2 },
      );
      expect(result).toBe(false);
    });

    it('should return true when data service indicates opted in', async () => {
      mockMessenger.call.mockResolvedValue({
        hasOptedIn: true,
        discount: 10.0,
      });

      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_2);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        { account: CAIP_ACCOUNT_2 },
      );
      expect(result).toBe(true);
    });

    it('should handle data service errors and return false', async () => {
      mockMessenger.call.mockRejectedValue(new Error('Network error'));

      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_2);

      expect(result).toBe(false);
    });

    it('should fetch fresh data when no cache timestamp exists', async () => {
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: null,
        lastPerpsDiscountRateFetched: null,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
        },
      });

      mockMessenger.call.mockResolvedValue({
        hasOptedIn: true,
        discount: 7.5,
      });

      const result = await controller.getHasAccountOptedIn(CAIP_ACCOUNT_1);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        { account: CAIP_ACCOUNT_1 },
      );
      expect(result).toBe(true);
    });
  });

  describe('estimatePoints', () => {
    beforeEach(() => {
      // Mock feature flag to be enabled by default for existing tests
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return default response when feature flag is disabled', async () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      const mockRequest = {
        activityType: 'SWAP' as const,
        account: CAIP_ACCOUNT_1,
        activityContext: {},
      };

      const result = await controller.estimatePoints(mockRequest);

      expect(result).toEqual({ pointsEstimate: 0, bonusBips: 0 });
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:estimatePoints',
        expect.anything(),
      );
    });

    it('should successfully estimate points', async () => {
      const mockRequest = {
        activityType: 'SWAP' as const,
        account: CAIP_ACCOUNT_1,
        activityContext: {},
      };

      const mockResponse = {
        pointsEstimate: 100,
        bonusBips: 200,
      };

      mockMessenger.call.mockResolvedValue(mockResponse);

      const result = await controller.estimatePoints(mockRequest);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:estimatePoints',
        mockRequest,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle estimate points errors', async () => {
      const mockRequest = {
        activityType: 'SWAP' as const,
        account: CAIP_ACCOUNT_1,
        activityContext: {},
      };

      mockMessenger.call.mockRejectedValue(new Error('API error'));

      await expect(controller.estimatePoints(mockRequest)).rejects.toThrow(
        'API error',
      );
    });
  });

  describe('getPointsEvents', () => {
    beforeEach(() => {
      // Mock feature flag to be enabled by default for existing tests
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return empty response when feature flag is disabled', async () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      const mockRequest = {
        seasonId: 'current',
        subscriptionId: 'sub-123',
        cursor: null,
      };

      const result = await controller.getPointsEvents(mockRequest);

      expect(result).toEqual({
        has_more: false,
        cursor: null,
        total_results: 0,
        results: [],
      });
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:getPointsEvents',
        expect.anything(),
      );
    });

    it('should successfully get points events', async () => {
      const mockRequest = {
        seasonId: 'current',
        subscriptionId: 'sub-123',
        cursor: null,
      };

      const mockResponse = {
        has_more: true,
        cursor: 'next-cursor',
        total_results: 50,
        results: [
          {
            id: 'event-123',
            timestamp: new Date('2024-01-01T10:00:00Z'),
            value: 100,
            bonus: { bips: 200, bonuses: ['loyalty'] },
            accountAddress: '0x123456789',
            type: 'SWAP' as const,
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
        ],
      };

      mockMessenger.call.mockResolvedValue(mockResponse);

      const result = await controller.getPointsEvents(mockRequest);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getPointsEvents',
        mockRequest,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should successfully get points events with cursor', async () => {
      const mockRequest = {
        seasonId: 'current',
        subscriptionId: 'sub-123',
        cursor: 'cursor-abc',
      };

      const mockResponse = {
        has_more: false,
        cursor: null,
        total_results: 25,
        results: [
          {
            id: 'event-456',
            timestamp: new Date('2024-01-01T11:00:00Z'),
            value: 50,
            bonus: null,
            accountAddress: '0x987654321',
            type: 'REFERRAL' as const,
            payload: null,
          },
        ],
      };

      mockMessenger.call.mockResolvedValue(mockResponse);

      const result = await controller.getPointsEvents(mockRequest);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getPointsEvents',
        mockRequest,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle getPointsEvents errors and rethrow them', async () => {
      const mockRequest = {
        seasonId: 'current',
        subscriptionId: 'sub-123',
        cursor: null,
      };

      const apiError = new Error('API error');
      mockMessenger.call.mockRejectedValue(apiError);

      await expect(controller.getPointsEvents(mockRequest)).rejects.toThrow(
        'API error',
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Failed to get points events:',
        'API error',
      );
    });
  });

  describe('getPerpsDiscountForAccount', () => {
    beforeEach(() => {
      // Mock feature flag to be enabled by default for existing tests
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return 0 when feature flag is disabled', async () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      const result = await controller.getPerpsDiscountForAccount(
        CAIP_ACCOUNT_1,
      );

      expect(result).toBe(0);
    });

    it('should return cached discount when available and fresh', async () => {
      const recentTime = Date.now() - 60000; // 1 minute ago
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 7.5,
        lastPerpsDiscountRateFetched: recentTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
        },
      });

      const result = await controller.getPerpsDiscountForAccount(
        CAIP_ACCOUNT_1,
      );

      expect(result).toBe(7.5);
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        expect.anything(),
      );
    });

    it('should fetch fresh discount when cache is stale', async () => {
      const staleTime = Date.now() - 600000; // 10 minutes ago
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 7.5,
        lastPerpsDiscountRateFetched: staleTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
        },
      });

      mockMessenger.call.mockResolvedValue({
        hasOptedIn: false,
        discount: 10.0,
      });

      const result = await controller.getPerpsDiscountForAccount(
        CAIP_ACCOUNT_1,
      );

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        { account: CAIP_ACCOUNT_1 },
      );
      expect(result).toBe(10.0);
    });

    it('should update store state with new discount value when fetching fresh data', async () => {
      const staleTime = Date.now() - 600000; // 10 minutes ago
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: true,
        subscriptionId: 'test',
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 7.5,
        lastPerpsDiscountRateFetched: staleTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
        },
      });

      mockMessenger.call.mockResolvedValue({
        hasOptedIn: true,
        discount: 15.0,
      });

      // Act
      const result = await controller.getPerpsDiscountForAccount(
        CAIP_ACCOUNT_1,
      );

      // Assert - verify state has been updated
      expect(result).toBe(15.0);
      const updatedAccountState = controller.state.accounts[CAIP_ACCOUNT_1];
      expect(updatedAccountState).toBeDefined();
      expect(updatedAccountState.perpsFeeDiscount).toBe(15.0);
      expect(updatedAccountState.hasOptedIn).toBe(true);
      expect(updatedAccountState.lastPerpsDiscountRateFetched).toBeGreaterThan(
        staleTime,
      );
    });

    it('should fetch discount for new accounts', async () => {
      mockMessenger.call.mockResolvedValue({
        hasOptedIn: false,
        discount: 15.0,
      });

      const result = await controller.getPerpsDiscountForAccount(
        CAIP_ACCOUNT_2,
      );

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getPerpsDiscount',
        { account: CAIP_ACCOUNT_2 },
      );
      expect(result).toBe(15.0);
    });

    it('should update store state when creating new account on first discount check', async () => {
      mockMessenger.call.mockResolvedValue({
        hasOptedIn: false,
        discount: 20.0,
      });

      // Act - check discount for account that doesn't exist in state
      const result = await controller.getPerpsDiscountForAccount(
        CAIP_ACCOUNT_3,
      );

      // Assert - verify new account state was created with correct values
      expect(result).toBe(20.0);
      const newAccountState = controller.state.accounts[CAIP_ACCOUNT_3];
      expect(newAccountState).toBeDefined();
      expect(newAccountState.account).toBe(CAIP_ACCOUNT_3);
      expect(newAccountState.hasOptedIn).toBe(false);
      expect(newAccountState.perpsFeeDiscount).toBe(20.0);
      expect(newAccountState.subscriptionId).toBeNull();
      expect(newAccountState.lastCheckedAuth).toBeGreaterThan(0);
      expect(newAccountState.lastPerpsDiscountRateFetched).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it('should return 0 on data service error', async () => {
      mockMessenger.call.mockRejectedValue(new Error('Network error'));

      const result = await controller.getPerpsDiscountForAccount(
        CAIP_ACCOUNT_2,
      );

      expect(result).toBe(0);
    });
  });

  describe('isRewardsFeatureEnabled', () => {
    beforeEach(() => {
      // Reset all mocks for this test suite
      jest.clearAllMocks();
    });

    it('should return true when feature flag is enabled', () => {
      // Mock the feature flag selector to return true
      mockSelectRewardsEnabledFlag.mockReturnValue(true);

      const result = controller.isRewardsFeatureEnabled();

      expect(result).toBe(true);
      expect(mockSelectRewardsEnabledFlag).toHaveBeenCalled();
    });

    it('should return false when feature flag is disabled', () => {
      // Mock the feature flag selector to return false
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      const result = controller.isRewardsFeatureEnabled();

      expect(result).toBe(false);
      expect(mockSelectRewardsEnabledFlag).toHaveBeenCalled();
    });

    it('should call selectRewardsEnabledFlag with store state', () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);

      controller.isRewardsFeatureEnabled();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectRewardsEnabledFlag).toHaveBeenCalled();
    });
  });

  describe('default state', () => {
    it('should return correct default state', () => {
      const defaultState = getRewardsControllerDefaultState();

      expect(defaultState).toEqual({
        activeAccount: null,
        accounts: {},
        subscriptions: {},
        seasons: {},
        subscriptionReferralDetails: {},
        seasonStatuses: {},
      });
    });
  });

  describe('performSilentAuth message formatting', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should format and convert authentication message to hex correctly', async () => {
      const mockInternalAccount = {
        address: '0x1234567890abcdef',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: ['eip155:1' as const],
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Test Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      };

      const mockTimestamp = 1609459200; // Fixed timestamp for predictable testing
      const expectedMessage = `rewards,${mockInternalAccount.address},${mockTimestamp}`;
      const expectedHexMessage =
        '0x' + Buffer.from(expectedMessage, 'utf8').toString('hex');

      // Mock Date.now to return predictable timestamp
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockTimestamp * 1000);

      mockMessenger.call
        .mockReturnValueOnce(mockInternalAccount)
        .mockResolvedValueOnce('0xsignature')
        .mockResolvedValueOnce({
          sessionId: 'session123',
          subscription: { id: 'sub123', referralCode: 'REF123', accounts: [] },
        });

      // Trigger authentication via account change
      const subscribeCallback = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      if (subscribeCallback) {
        await subscribeCallback(mockInternalAccount, mockInternalAccount);
      }

      // Verify the message was formatted and converted to hex correctly
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signPersonalMessage',
        {
          data: expectedHexMessage,
          from: mockInternalAccount.address,
        },
      );

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });

  describe('performSilentAuth CAIP conversion', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should handle CAIP account ID conversion from internal account scopes', async () => {
      // Given: Internal account with valid EVM scope
      const mockInternalAccount = {
        address: '0x123',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: ['eip155:1' as const],
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Test Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      };

      const mockLoginResponse = {
        sessionId: 'session123',
        subscription: { id: 'sub123', referralCode: 'REF123', accounts: [] },
      };

      mockMessenger.call
        .mockReturnValueOnce(mockInternalAccount)
        .mockResolvedValueOnce('0xsignature')
        .mockResolvedValueOnce(mockLoginResponse);

      // When: Authentication is triggered
      const subscribeCallback = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      if (subscribeCallback) {
        await subscribeCallback(mockInternalAccount, mockInternalAccount);
      }

      // Then: Login should be called with the original address (not CAIP format)
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.objectContaining({
          account: '0x123', // Uses raw address, not CAIP format
          signature: '0xsignature',
          timestamp: expect.any(Number),
        }),
      );
    });
  });

  describe('getSeasonStatus', () => {
    const mockSeasonId = 'season123';
    const mockSubscriptionId = 'sub123';

    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return null when feature flag is disabled', async () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      const result = await controller.getSeasonStatus(
        mockSubscriptionId,
        mockSeasonId,
      );
      expect(result).toBeNull();
    });

    it('should return cached season status when cache is fresh', async () => {
      const recentTime = Date.now() - 30000; // 30 seconds ago (within 1 minute threshold)
      const compositeKey = `${mockSeasonId}:${mockSubscriptionId}`;

      const mockSeasonData: SeasonDtoState = {
        id: mockSeasonId,
        name: 'Test Season',
        startDate: Date.now() - 86400000, // 1 day ago
        endDate: Date.now() + 86400000, // 1 day from now
        tiers: createTestTiers(),
      };

      const mockSeasonStatus: SeasonStatusState = {
        season: mockSeasonData,
        balance: {
          total: 1500,
          refereePortion: 300,
          updatedAt: Date.now() - 3600000, // 1 hour ago
        },
        tier: {
          currentTier: { id: 'silver', name: 'Silver', pointsNeeded: 1000 },
          nextTier: { id: 'gold', name: 'Gold', pointsNeeded: 5000 },
          nextTierPointsNeeded: 3500, // 5000 - 1500
        },
        lastFetched: recentTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: {},
          subscriptions: {
            [mockSubscriptionId]: {
              id: mockSubscriptionId,
              referralCode: 'REF123',
              accounts: [],
            },
          },
          seasons: {
            [mockSeasonId]: mockSeasonData,
          },
          subscriptionReferralDetails: {},
          seasonStatuses: {
            [compositeKey]: mockSeasonStatus,
          },
        },
      });

      const result = await controller.getSeasonStatus(
        mockSubscriptionId,
        mockSeasonId,
      );

      expect(result).toEqual(mockSeasonStatus);
      expect(result?.season.id).toBe(mockSeasonId);
      expect(result?.balance.total).toBe(1500);
      expect(result?.tier.currentTier.id).toBe('silver');
      expect(result?.tier.nextTier?.id).toBe('gold');
      expect(result?.tier.nextTierPointsNeeded).toBe(3500);
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:getSeasonStatus',
        expect.anything(),
        expect.anything(),
      );
    });

    it('should fetch fresh season status when cache is stale', async () => {
      const mockApiResponse = createTestSeasonStatus();

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: {},
          subscriptions: {
            [mockSubscriptionId]: {
              id: mockSubscriptionId,
              referralCode: 'REF123',
              accounts: [],
            },
          },
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      mockMessenger.call.mockResolvedValue(mockApiResponse);

      const result = await controller.getSeasonStatus(
        mockSubscriptionId,
        mockSeasonId,
      );

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getSeasonStatus',
        mockSeasonId,
        mockSubscriptionId,
      );

      // Expect the result to be the converted state object, not the original DTO
      expect(result).toBeDefined();
      expect(result?.balance.total).toBe(1500);
      expect(result?.tier.currentTier.id).toBe('silver');
      expect(result?.lastFetched).toBeGreaterThan(Date.now() - 1000);
    });

    it('should update state when fetching fresh season status', async () => {
      const mockApiResponse = createTestSeasonStatus({
        season: {
          id: mockSeasonId,
          name: 'Fresh Season',
          startDate: new Date(),
          endDate: new Date(),
          tiers: createTestTiers(),
        },
        balance: { total: 2500, updatedAt: new Date() },
        currentTierId: 'gold',
      });

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: {},
          subscriptions: {
            [mockSubscriptionId]: {
              id: mockSubscriptionId,
              referralCode: 'REF123',
              accounts: [],
            },
          },
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      mockMessenger.call.mockResolvedValue(mockApiResponse);

      const result = await controller.getSeasonStatus(
        mockSubscriptionId,
        mockSeasonId,
      );

      // Check that the result is the converted state object
      expect(result).toBeDefined();
      expect(result?.balance.total).toBe(2500);
      expect(result?.tier.currentTier.id).toBe('gold');
      expect(result?.tier.nextTier?.id).toBe('platinum');
      expect(result?.tier.nextTierPointsNeeded).toBe(7500); // 10000 - 2500
      expect(result?.lastFetched).toBeGreaterThan(Date.now() - 1000);

      // Check season status in root map with composite key
      const compositeKey = `${mockSeasonId}:${mockSubscriptionId}`;
      const seasonStatus = controller.state.seasonStatuses[compositeKey];
      expect(seasonStatus).toBeDefined();
      expect(seasonStatus).toEqual(result); // Should be the same object

      // Check seasons map
      const storedSeason = controller.state.seasons[mockSeasonId];
      expect(storedSeason).toBeDefined();
      expect(storedSeason.id).toBe(mockSeasonId);
      expect(storedSeason.name).toBe(mockApiResponse.season.name);
      expect(storedSeason.tiers).toHaveLength(4);
    });

    it('should handle errors from data service', async () => {
      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: {},
          subscriptions: {
            [mockSubscriptionId]: {
              id: mockSubscriptionId,
              referralCode: 'REF123',
              accounts: [],
            },
          },
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      mockMessenger.call.mockRejectedValue(new Error('API error'));

      await expect(
        controller.getSeasonStatus(mockSubscriptionId, mockSeasonId),
      ).rejects.toThrow('API error');
    });
  });

  describe('getReferralDetails', () => {
    const mockSubscriptionId = 'sub123';

    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return null when feature flag is disabled', async () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      const result = await controller.getReferralDetails(mockSubscriptionId);
      expect(result).toBeNull();
    });

    it('should return cached referral details when cache is fresh', async () => {
      const recentTime = Date.now() - 300000; // 5 minutes ago (within 10 minute threshold)
      const mockReferralDetailsState: SubscriptionReferralDetailsState = {
        referralCode: 'REF456',
        totalReferees: 10,
        lastFetched: recentTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: {},
          subscriptions: {
            [mockSubscriptionId]: {
              id: mockSubscriptionId,
              referralCode: 'REF123',
              accounts: [],
            },
          },
          seasons: {},
          subscriptionReferralDetails: {
            [mockSubscriptionId]: mockReferralDetailsState,
          },
          seasonStatuses: {},
        },
      });

      const result = await controller.getReferralDetails(mockSubscriptionId);

      expect(result).toEqual(mockReferralDetailsState);
      expect(result?.referralCode).toBe('REF456');
      expect(result?.totalReferees).toBe(10);
      expect(result?.lastFetched).toBe(recentTime);
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:getReferralDetails',
        expect.anything(),
      );
    });

    it('should fetch fresh referral details when cache is stale', async () => {
      const mockApiResponse = {
        referralCode: 'NEWFRESH123',
        totalReferees: 25,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: {},
          subscriptions: {
            [mockSubscriptionId]: {
              id: mockSubscriptionId,
              referralCode: 'REF123',
              accounts: [],
            },
          },
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      mockMessenger.call.mockResolvedValue(mockApiResponse);

      const result = await controller.getReferralDetails(mockSubscriptionId);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getReferralDetails',
        mockSubscriptionId,
      );

      // Expect the result to be the converted state object, not the original DTO
      expect(result).toBeDefined();
      expect(result?.referralCode).toBe('NEWFRESH123');
      expect(result?.totalReferees).toBe(25);
      expect(result?.lastFetched).toBeGreaterThan(Date.now() - 1000);
    });

    it('should update state when fetching fresh referral details', async () => {
      const mockApiResponse = {
        referralCode: 'UPDATED789',
        totalReferees: 15,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: {},
          subscriptions: {
            [mockSubscriptionId]: {
              id: mockSubscriptionId,
              referralCode: 'REF123',
              accounts: [],
            },
          },
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      mockMessenger.call.mockResolvedValue(mockApiResponse);

      const result = await controller.getReferralDetails(mockSubscriptionId);

      // Check that the result is the converted state object
      expect(result).toBeDefined();
      expect(result?.referralCode).toBe('UPDATED789');
      expect(result?.totalReferees).toBe(15);
      expect(result?.lastFetched).toBeGreaterThan(Date.now() - 1000);

      const updatedReferralDetails =
        controller.state.subscriptionReferralDetails[mockSubscriptionId];
      expect(updatedReferralDetails).toBeDefined();
      expect(updatedReferralDetails).toEqual(result); // Should be the same object
      expect(updatedReferralDetails.referralCode).toBe(
        mockApiResponse.referralCode,
      );
      expect(updatedReferralDetails.totalReferees).toBe(
        mockApiResponse.totalReferees,
      );
      expect(updatedReferralDetails.lastFetched).toBeGreaterThan(
        Date.now() - 1000,
      );
    });
  });

  describe('optIn', () => {
    const mockInternalAccount = {
      address: '0x123456789',
      type: 'eip155:eoa' as const,
      id: 'test-id',
      scopes: ['eip155:1' as const],
      options: {},
      methods: ['personal_sign'],
      metadata: {
        name: 'Test Account',
        keyring: { type: 'HD Key Tree' },
        importTime: Date.now(),
      },
    } as InternalAccount;

    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should skip opt-in when feature flag is disabled', async () => {
      // Arrange
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      // Act
      await controller.optIn(mockInternalAccount);

      // Assert - Should not call generateChallenge, signPersonalMessage, or optin
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:generateChallenge',
        expect.anything(),
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'KeyringController:signPersonalMessage',
        expect.anything(),
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:optin',
        expect.anything(),
      );
    });

    it('should handle signature generation errors', async () => {
      // Arrange
      const mockChallengeResponse = {
        id: 'challenge-123',
        message: 'test challenge message',
      };

      mockMessenger.call
        .mockResolvedValueOnce(mockChallengeResponse)
        .mockRejectedValueOnce(new Error('Signature failed'));

      // Act & Assert
      await expect(controller.optIn(mockInternalAccount)).rejects.toThrow(
        'Signature failed',
      );
    });

    it('should handle optin service errors', async () => {
      // Arrange
      const mockChallengeResponse = {
        id: 'challenge-123',
        message: 'test challenge message',
      };
      const mockSignature = '0xsignature123';

      mockMessenger.call
        .mockResolvedValueOnce(mockChallengeResponse)
        .mockResolvedValueOnce(mockSignature)
        .mockRejectedValueOnce(new Error('Optin failed'));

      // Act & Assert
      await expect(controller.optIn(mockInternalAccount)).rejects.toThrow(
        'Optin failed',
      );
    });

    it('should use Buffer fallback when toHex fails during hex message conversion', async () => {
      // Arrange
      const mockChallengeResponse = {
        id: 'challenge-123',
        message: 'test challenge with special chars: éñü',
      };
      const mockSignature = '0xsignature123';
      const mockOptinResponse = {
        sessionId: 'session-456',
        subscription: {
          id: 'sub-789',
          referralCode: 'REF123',
          accounts: [],
        },
      };

      // Mock toHex to throw an error, triggering the Buffer fallback
      mockToHex.mockImplementation(() => {
        throw new Error('toHex encoding error');
      });

      mockMessenger.call
        .mockResolvedValueOnce(mockChallengeResponse) // generateChallenge
        .mockResolvedValueOnce(mockSignature) // signPersonalMessage
        .mockResolvedValueOnce(mockOptinResponse); // optin

      // Act
      await controller.optIn(mockInternalAccount);

      // Assert
      expect(mockToHex).toHaveBeenCalledWith(mockChallengeResponse.message);

      // Verify the fallback Buffer conversion was used by checking the hex data passed to signing
      const expectedBufferHex =
        '0x' +
        Buffer.from(mockChallengeResponse.message, 'utf8').toString('hex');
      expect(mockMessenger.call).toHaveBeenNthCalledWith(
        3,
        'KeyringController:signPersonalMessage',
        {
          data: expectedBufferHex,
          from: mockInternalAccount.address,
        },
      );
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should skip logout when feature flag is disabled', async () => {
      // Arrange
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      // Act
      await controller.logout();

      // Assert - Should not call logout service
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:logout',
        expect.anything(),
      );
    });

    it('should skip logout when no authenticated account exists', async () => {
      // Arrange
      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: {},
          subscriptions: {},
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      // Act
      await controller.logout();

      // Assert - Should not call logout service
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:logout',
        expect.anything(),
      );
    });

    it('should clear last authenticated account only if subscription matches', async () => {
      // Arrange
      const mockSubscriptionId = 'sub-123';

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: {
            account: CAIP_ACCOUNT_1,
            lastCheckedAuthError: false,
            hasOptedIn: true,
            subscriptionId: mockSubscriptionId,
            lastCheckedAuth: Date.now(),
            perpsFeeDiscount: 5.0,
            lastPerpsDiscountRateFetched: Date.now(),
          },
          accounts: {},
          subscriptions: {},
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      mockMessenger.call.mockResolvedValue(undefined);

      // Act
      await controller.logout();

      // Assert
      expect(controller.state.activeAccount).toBeNull();
    });

    it('should successfully complete full logout flow - happy path', async () => {
      // Arrange
      const mockSubscriptionId = 'sub-456';
      const mockActiveAccount = {
        account: CAIP_ACCOUNT_1,
        lastCheckedAuthError: false,
        hasOptedIn: true,
        subscriptionId: mockSubscriptionId,
        lastCheckedAuth: Date.now(),
        perpsFeeDiscount: 10.0,
        lastPerpsDiscountRateFetched: Date.now(),
      };

      const mockInternalAccount = {
        address: '0x123',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: ['eip155:1' as const],
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Test Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      };

      // Mock getSelectedMultichainAccount to return valid account during initialization
      mockMessenger.call.mockReturnValue(mockInternalAccount);

      // Mock token storage to succeed during initialization
      mockStoreSubscriptionToken.mockResolvedValue({ success: true });

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: mockActiveAccount,
          accounts: {
            [CAIP_ACCOUNT_1]: mockActiveAccount,
          },
          subscriptions: {
            [mockSubscriptionId]: {
              id: mockSubscriptionId,
              referralCode: 'REF456',
              accounts: [],
            },
          },
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      // Clear only the messenger calls made during initialization, preserve other mocks
      mockMessenger.call.mockClear();
      mockStoreSubscriptionToken.mockClear();
      mockRemoveSubscriptionToken.mockClear();

      // Mock successful data service logout and token removal for the actual test
      mockMessenger.call.mockResolvedValue(undefined);
      mockRemoveSubscriptionToken.mockResolvedValue({ success: true });

      // Verify state is correctly set before calling logout
      expect(controller.state.activeAccount).not.toBeNull();
      expect(controller.state.activeAccount?.subscriptionId).toBe(
        mockSubscriptionId,
      );

      // Act
      await controller.logout();

      // Assert - Verify data service logout was called
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:logout',
        mockSubscriptionId,
      );

      // Assert - Verify session token removal was called
      expect(mockRemoveSubscriptionToken).toHaveBeenCalledWith(
        mockSubscriptionId,
      );

      // Assert - Verify state was cleared correctly
      expect(controller.state.activeAccount).toBeNull();
      expect(controller.state.accounts[CAIP_ACCOUNT_1]).toBeUndefined();

      // Assert - Verify success was logged
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Logout completed successfully',
      );

      // Assert - Verify subscription data is preserved (logout doesn't clear subscriptions)
      expect(controller.state.subscriptions[mockSubscriptionId]).toBeDefined();
    });
  });

  describe('validateReferralCode', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return false when feature flag is disabled', async () => {
      // Arrange
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      // Act
      const result = await controller.validateReferralCode('ABC123');

      // Assert
      expect(result).toBe(false);
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:validateReferralCode',
        expect.anything(),
      );
    });

    it('should return false for empty or whitespace-only codes', async () => {
      // Act & Assert
      expect(await controller.validateReferralCode('')).toBe(false);
      expect(await controller.validateReferralCode('   ')).toBe(false);
      expect(await controller.validateReferralCode('\t\n')).toBe(false);
    });

    it('should return false for codes with incorrect length', async () => {
      // Act & Assert
      expect(await controller.validateReferralCode('ABC12')).toBe(false); // Too short
      expect(await controller.validateReferralCode('ABC1234')).toBe(false); // Too long
    });

    it('should return false for codes with invalid characters', async () => {
      // Act & Assert
      expect(await controller.validateReferralCode('ABC12@')).toBe(false); // Invalid character @
      expect(await controller.validateReferralCode('ABC120')).toBe(false); // Invalid character 0
      expect(await controller.validateReferralCode('ABC121')).toBe(false); // Invalid character 1
      expect(await controller.validateReferralCode('ABC12I')).toBe(false); // Invalid character I
      expect(await controller.validateReferralCode('ABC12O')).toBe(false); // Invalid character O
    });

    it('should return true for valid referral codes from service', async () => {
      // Arrange
      jest.clearAllMocks();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'RewardsDataService:validateReferralCode') {
          return Promise.resolve({ valid: true });
        }
        return Promise.resolve();
      });

      // Act
      const result = await controller.validateReferralCode('ABC234'); // Using valid Base32 code

      // Assert
      expect(result).toBe(true);
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:validateReferralCode',
        'ABC234',
      );
    });

    it('should return false for invalid referral codes from service', async () => {
      // Arrange
      jest.clearAllMocks();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockMessenger.call.mockImplementation((action, ..._args): any => {
        if (action === 'RewardsDataService:validateReferralCode') {
          return Promise.resolve({ valid: false });
        }
        return Promise.resolve();
      });

      // Act
      const result = await controller.validateReferralCode('XYZ567'); // Using valid Base32 code

      // Assert
      expect(result).toBe(false);
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:validateReferralCode',
        'XYZ567',
      );
    });

    it('should accept valid base32 characters', async () => {
      // Act & Assert
      const validCodes = ['ABCDEF', 'ABC234', 'XYZ567', 'DEF237'];

      for (const code of validCodes) {
        jest.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockMessenger.call.mockImplementation((action, ..._args): any => {
          if (action === 'RewardsDataService:validateReferralCode') {
            return Promise.resolve({ valid: true });
          }
          return Promise.resolve();
        });

        const result = await controller.validateReferralCode(code);
        expect(result).toBe(true);
        expect(mockMessenger.call).toHaveBeenCalledWith(
          'RewardsDataService:validateReferralCode',
          code,
        );
      }
    });

    it('should handle service errors and return false', async () => {
      // Arrange
      jest.clearAllMocks();
      mockMessenger.call.mockRejectedValue(new Error('Service error'));

      // Act
      const result = await controller.validateReferralCode('ABC123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('calculateTierStatus', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should throw error when current tier ID is not found in season tiers', () => {
      // Arrange
      const tiers = createTestTiers();
      const invalidCurrentTierId = 'invalid-tier';
      const currentPoints = 1500;

      // Act & Assert
      expect(() => {
        controller.calculateTierStatus(
          tiers,
          invalidCurrentTierId,
          currentPoints,
        );
      }).toThrow(
        `Current tier ${invalidCurrentTierId} not found in season tiers`,
      );
    });

    it('should return null for next tier when current tier is the last tier', () => {
      // Arrange
      const tiers = createTestTiers();
      const lastTierCurrentTierId = 'platinum'; // Last tier in createTestTiers
      const currentPoints = 15000; // More than platinum tier

      // Act
      const result = controller.calculateTierStatus(
        tiers,
        lastTierCurrentTierId,
        currentPoints,
      );

      // Assert
      expect(result.currentTier.id).toBe(lastTierCurrentTierId);
      expect(result.nextTier).toBeNull();
      expect(result.nextTierPointsNeeded).toBeNull();
    });

    it('should calculate nextTierPointsNeeded correctly with Math.max', () => {
      // Arrange
      const tiers = createTestTiers();
      const currentTierId = 'silver'; // Silver requires 1000 points, Gold requires 5000

      // Test case where user has more points than needed for next tier
      const currentPointsAboveNext = 6000; // More than Gold's 5000 requirement

      // Act
      const result = controller.calculateTierStatus(
        tiers,
        currentTierId,
        currentPointsAboveNext,
      );

      // Assert
      expect(result.currentTier.id).toBe('silver');
      expect(result.nextTier?.id).toBe('gold');
      expect(result.nextTierPointsNeeded).toBe(0); // Math.max(0, 5000 - 6000) = 0
    });

    it('should calculate nextTierPointsNeeded correctly when points needed is positive', () => {
      // Arrange
      const tiers = createTestTiers();
      const currentTierId = 'bronze'; // Bronze requires 0 points, Silver requires 1000
      const currentPoints = 250; // Less than Silver's 1000 requirement

      // Act
      const result = controller.calculateTierStatus(
        tiers,
        currentTierId,
        currentPoints,
      );

      // Assert
      expect(result.currentTier.id).toBe('bronze');
      expect(result.nextTier?.id).toBe('silver');
      expect(result.nextTierPointsNeeded).toBe(750); // Math.max(0, 1000 - 250) = 750
    });

    it('should sort tiers by points needed before processing', () => {
      // Arrange - Create tiers in random order
      const unsortedTiers: SeasonTierDto[] = [
        { id: 'platinum', name: 'Platinum', pointsNeeded: 10000 },
        { id: 'bronze', name: 'Bronze', pointsNeeded: 0 },
        { id: 'gold', name: 'Gold', pointsNeeded: 5000 },
        { id: 'silver', name: 'Silver', pointsNeeded: 1000 },
      ];
      const currentTierId = 'silver';
      const currentPoints = 1500;

      // Act
      const result = controller.calculateTierStatus(
        unsortedTiers,
        currentTierId,
        currentPoints,
      );

      // Assert - Should correctly identify next tier as Gold despite unsorted input
      expect(result.currentTier.id).toBe('silver');
      expect(result.nextTier?.id).toBe('gold');
      expect(result.nextTierPointsNeeded).toBe(3500); // 5000 - 1500
    });
  });

  describe('convertInternalAccountToCaipAccountId', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
      jest.clearAllMocks();
    });

    it('should log error when conversion fails due to invalid internal account', () => {
      // Arrange
      const invalidInternalAccount = {
        address: '0x123',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: ['invalid-scope' as `${string}:${string}`], // Invalid scope format
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Test Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      };

      // Act
      const result = controller.convertInternalAccountToCaipAccountId(
        invalidInternalAccount,
      );

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Failed to convert address to CAIP-10 format:',
        expect.any(Error),
      );
    });

    it('should return null and log error when account scopes is empty', () => {
      // Arrange
      const accountWithNoScopes = {
        address: '0x123',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: [] as `${string}:${string}`[], // Empty scopes array
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Test Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      };

      // Act
      const result =
        controller.convertInternalAccountToCaipAccountId(accountWithNoScopes);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Failed to convert address to CAIP-10 format:',
        expect.any(Error),
      );
    });

    it('should successfully convert valid internal account to CAIP account ID', () => {
      // Arrange
      const validInternalAccount = {
        address: '0x123456789',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: ['eip155:1' as const],
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Test Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      };

      // Act
      const result =
        controller.convertInternalAccountToCaipAccountId(validInternalAccount);

      // Assert
      expect(result).toBe('eip155:1:0x123456789');
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        'RewardsController: Failed to convert address to CAIP-10 format:',
        expect.anything(),
      );
    });
  });

  describe('silent auth skipping behavior', () => {
    let originalDateNow: () => number;
    let subscribeCallback: any;

    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
      mockIsHardwareAccount.mockReturnValue(false);
      mockIsSolanaAddress.mockReturnValue(false);

      // Mock Date.now for consistent testing
      originalDateNow = Date.now;
      Date.now = jest.fn(() => 1000000); // Fixed timestamp

      // Get the account change subscription callback
      const subscribeCalls = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      );
      subscribeCallback = subscribeCalls
        ? subscribeCalls[1]
        : async () => undefined;
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    it('should skip silent auth for hardware accounts', async () => {
      // Arrange
      mockIsHardwareAccount.mockReturnValue(true);
      const mockAccount = {
        address: '0x123',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: ['eip155:1' as const],
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Hardware Account',
          keyring: { type: 'Ledger Hardware' },
          importTime: Date.now(),
        },
      };

      mockMessenger.call.mockReturnValue(mockAccount);

      // Act - trigger account change
      if (subscribeCallback) {
        await subscribeCallback(mockAccount, mockAccount);
      }

      // Assert - should not attempt to call login service for hardware accounts
      expect(mockIsHardwareAccount).toHaveBeenCalledWith('0x123');
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.anything(),
      );
    });

    it('should skip silent auth for Solana addresses', async () => {
      // Arrange
      mockIsSolanaAddress.mockReturnValue(true);
      const mockAccount = {
        address: 'solana-address',
        type: 'solana:data-account' as const,
        id: 'test-id',
        scopes: ['solana:mainnet' as const],
        options: {},
        methods: ['solana_signMessage'],
        metadata: {
          name: 'Solana Account',
          keyring: { type: 'Solana Keyring' },
          importTime: Date.now(),
        },
      };

      mockMessenger.call.mockReturnValue(mockAccount);

      // Act - trigger account change
      if (subscribeCallback) {
        await subscribeCallback(mockAccount, mockAccount);
      }

      // Assert - should not attempt to call login service for Solana accounts
      expect(mockIsSolanaAddress).toHaveBeenCalledWith('solana-address');
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.anything(),
      );
    });

    it('should perform silent auth when outside grace period', async () => {
      // Arrange
      const now = 1000000;
      const outsideGracePeriod = now - 15 * 60 * 1000; // 15 minutes ago (outside grace period)

      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: outsideGracePeriod,
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: null,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          activeAccount: null,
          accounts: { [CAIP_ACCOUNT_1]: accountState as RewardsAccountState },
          subscriptions: {},
          seasons: {},
          subscriptionReferralDetails: {},
          seasonStatuses: {},
        },
      });

      const mockAccount = {
        address: '0x123',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: ['eip155:1' as const],
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Test Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      };

      mockMessenger.call
        .mockReturnValueOnce(mockAccount) // getSelectedMultichainAccount
        .mockResolvedValueOnce('0xsignature') // signPersonalMessage
        .mockResolvedValueOnce({
          // login
          sessionId: 'session123',
          subscription: { id: 'sub123', referralCode: 'REF123', accounts: [] },
        });

      // Get the new subscription callback for the recreated controller
      const newSubscribeCallback = mockMessenger.subscribe.mock.calls
        .filter(
          (call) => call[0] === 'AccountsController:selectedAccountChange',
        )
        .pop()?.[1];

      // Act - trigger account change
      if (newSubscribeCallback) {
        await newSubscribeCallback(mockAccount, mockAccount);
      }

      // Assert - should attempt authentication outside grace period
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signPersonalMessage',
        expect.objectContaining({
          from: '0x123',
        }),
      );
    });
  });

  describe('getGeoRewardsMetadata', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return default metadata when rewards feature is disabled', async () => {
      // Arrange
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      // Act
      const result = await controller.getGeoRewardsMetadata();

      // Assert
      expect(result).toEqual({
        geoLocation: 'UNKNOWN',
        optinAllowedForGeo: false,
      });
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:fetchGeoLocation',
      );
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        'RewardsController: Fetching geo location for rewards metadata',
      );
    });

    it('should return cached geo location when available', async () => {
      // Arrange
      const mockCachedGeoData = {
        geoLocation: 'US-NY',
        optinAllowedForGeo: true,
      };

      // First call to populate cache
      mockMessenger.call.mockResolvedValueOnce('US-NY');
      const firstResult = await controller.getGeoRewardsMetadata();

      // Clear messenger call mock to verify no additional calls are made
      jest.clearAllMocks();

      // Act - Second call should use cache
      const secondResult = await controller.getGeoRewardsMetadata();

      // Assert - Verify cached data is returned
      expect(secondResult).toEqual(mockCachedGeoData);
      expect(secondResult).toEqual(firstResult); // Should be the same as first call

      // Assert - Verify cache log message
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Using cached geo location',
        {
          location: mockCachedGeoData,
        },
      );

      // Assert - Verify no additional API calls were made
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:fetchGeoLocation',
      );

      // Assert - Verify fetching log message was not called on cached access
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        'RewardsController: Fetching geo location for rewards metadata',
      );
    });

    it('should successfully fetch geo location for allowed region', async () => {
      // Arrange
      const mockGeoLocation = 'US-CA';
      mockMessenger.call.mockResolvedValueOnce(mockGeoLocation);

      // Act
      const result = await controller.getGeoRewardsMetadata();

      // Assert
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:fetchGeoLocation',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Fetching geo location for rewards metadata',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Geo rewards metadata retrieved',
        {
          geoLocation: mockGeoLocation,
          optinAllowedForGeo: true,
        },
      );
      expect(result).toEqual({
        geoLocation: mockGeoLocation,
        optinAllowedForGeo: true,
      });
    });

    it('should handle blocked regions correctly', async () => {
      // Arrange
      const mockGeoLocation = 'UK-ENG'; // UK is in DEFAULT_BLOCKED_REGIONS
      mockMessenger.call.mockResolvedValueOnce(mockGeoLocation);

      // Act
      const result = await controller.getGeoRewardsMetadata();

      // Assert
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:fetchGeoLocation',
      );
      expect(result).toEqual({
        geoLocation: mockGeoLocation,
        optinAllowedForGeo: false,
      });
    });

    it('should handle geo location service errors with fallback', async () => {
      // Arrange
      const geoServiceError = new Error('Geo service unavailable');
      mockMessenger.call.mockRejectedValueOnce(geoServiceError);

      // Act
      const result = await controller.getGeoRewardsMetadata();

      // Assert
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:fetchGeoLocation',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Fetching geo location for rewards metadata',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Failed to get geo rewards metadata:',
        geoServiceError.message,
      );
      expect(result).toEqual({
        geoLocation: 'UNKNOWN',
        optinAllowedForGeo: true,
      });
    });

    it('should handle non-Error objects in catch block', async () => {
      // Arrange
      const nonErrorObject = 'String error';
      mockMessenger.call.mockRejectedValueOnce(nonErrorObject);

      // Act
      const result = await controller.getGeoRewardsMetadata();

      // Assert
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:fetchGeoLocation',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Failed to get geo rewards metadata:',
        String(nonErrorObject),
      );
      expect(result).toEqual({
        geoLocation: 'UNKNOWN',
        optinAllowedForGeo: true,
      });
    });
  });

  describe('performSilentAuth session token storage', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
      mockIsHardwareAccount.mockReturnValue(false);
      mockIsSolanaAddress.mockReturnValue(false);
    });

    it('should throw error when session token storage fails', async () => {
      // Arrange
      const mockInternalAccount = {
        address: '0x123',
        type: 'eip155:eoa' as const,
        id: 'test-id',
        scopes: ['eip155:1' as const],
        options: {},
        methods: ['personal_sign'],
        metadata: {
          name: 'Test Account',
          keyring: { type: 'HD Key Tree' },
          importTime: Date.now(),
        },
      };

      const mockLoginResponse = {
        sessionId: 'session123',
        subscription: { id: 'sub123', referralCode: 'REF123', accounts: [] },
      };

      // Mock successful login but failed token storage
      mockMessenger.call
        .mockReturnValueOnce(mockInternalAccount) // getSelectedMultichainAccount
        .mockResolvedValueOnce('0xsignature') // signPersonalMessage
        .mockResolvedValueOnce(mockLoginResponse); // login

      // Mock token storage failure
      mockStoreSubscriptionToken.mockResolvedValue({ success: false });

      // Clear only the messenger calls made during initialization, preserve other mocks
      mockMessenger.call.mockClear();
      mockStoreSubscriptionToken.mockClear();

      // Act & Assert
      const subscribeCallback = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      if (subscribeCallback) {
        // Setup mocks for the actual test
        mockMessenger.call
          .mockReturnValueOnce(mockInternalAccount) // getSelectedMultichainAccount
          .mockResolvedValueOnce('0xsignature') // signPersonalMessage
          .mockResolvedValueOnce(mockLoginResponse); // login

        mockStoreSubscriptionToken.mockResolvedValue({ success: false });

        // Should log error and not update state
        await subscribeCallback(mockInternalAccount, mockInternalAccount);

        // Verify error was logged
        expect(mockLogger.log).toHaveBeenCalledWith(
          'RewardsController: Failed to store session token',
          'eip155:1:0x123',
        );

        // Verify the account state is updated with error condition
        const updatedAccountState =
          controller.state.accounts['eip155:1:0x123' as CaipAccountId];
        expect(updatedAccountState).toBeDefined();
        expect(updatedAccountState.lastCheckedAuthError).toBe(true);
        expect(updatedAccountState.hasOptedIn).toBeUndefined(); // Should be undefined due to error
        expect(updatedAccountState.subscriptionId).toBeNull();
      }
    });
  });

  describe('optOut', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return false when no active account exists', async () => {
      // Arrange
      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          activeAccount: null,
        },
      });

      // Act
      const result = await testController.optOut();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: No active account or subscription ID found for opt-out',
      );
    });

    it('should return false when active account has no subscription ID', async () => {
      // Arrange
      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          activeAccount: {
            account: CAIP_ACCOUNT_1,
            hasOptedIn: true,
            subscriptionId: null,
            lastCheckedAuth: Date.now(),
            lastCheckedAuthError: false,
            perpsFeeDiscount: null,
            lastPerpsDiscountRateFetched: null,
          },
        },
      });

      // Act
      const result = await testController.optOut();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: No active account or subscription ID found for opt-out',
      );
    });

    it('should successfully opt out and reset state', async () => {
      // Arrange
      const mockOptOutResponse = { success: true };
      mockMessenger.call.mockResolvedValue(mockOptOutResponse);
      mockRemoveSubscriptionToken.mockResolvedValue({ success: true });

      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          activeAccount: {
            account: CAIP_ACCOUNT_1,
            hasOptedIn: true,
            subscriptionId: 'sub123',
            lastCheckedAuth: Date.now(),
            lastCheckedAuthError: false,
            perpsFeeDiscount: null,
            lastPerpsDiscountRateFetched: null,
          },
          subscriptions: {
            sub123: {
              id: 'sub123',
              referralCode: 'REF123',
              accounts: [],
            },
          },
        },
      });

      // Act
      const result = await testController.optOut();

      // Assert
      expect(result).toBe(true);
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:optOut',
        'sub123',
      );
      expect(mockRemoveSubscriptionToken).toHaveBeenCalledWith('sub123');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Successfully opted out of rewards program',
        'sub123',
      );

      // Verify state was reset and active account updated
      const newState = testController.state;
      expect(newState.activeAccount).toEqual({
        account: CAIP_ACCOUNT_1,
        hasOptedIn: false,
        subscriptionId: null,
        lastCheckedAuth: expect.any(Number),
        lastCheckedAuthError: false,
        perpsFeeDiscount: null,
        lastPerpsDiscountRateFetched: null,
      });
      expect(newState.subscriptions).toEqual({});
      expect(newState.accounts).toEqual({});
    });

    it('should return false when opt-out service returns false', async () => {
      // Arrange
      const mockOptOutResponse = { success: false };
      mockMessenger.call.mockResolvedValue(mockOptOutResponse);

      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          activeAccount: {
            account: CAIP_ACCOUNT_1,
            hasOptedIn: true,
            subscriptionId: 'sub123',
            lastCheckedAuth: Date.now(),
            lastCheckedAuthError: false,
            perpsFeeDiscount: null,
            lastPerpsDiscountRateFetched: null,
          },
          subscriptions: {
            sub123: {
              id: 'sub123',
              referralCode: 'REF123',
              accounts: [],
            },
          },
        },
      });

      // Act
      const result = await testController.optOut();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Opt-out request returned false',
        'sub123',
      );
      expect(mockRemoveSubscriptionToken).not.toHaveBeenCalled();
    });

    it('should return false when subscription not found in map', async () => {
      // Arrange
      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          activeAccount: {
            account: CAIP_ACCOUNT_1,
            hasOptedIn: true,
            subscriptionId: 'sub123',
            lastCheckedAuth: Date.now(),
            lastCheckedAuthError: false,
            perpsFeeDiscount: null,
            lastPerpsDiscountRateFetched: null,
          },
          subscriptions: {}, // No subscription
        },
      });

      // Act
      const result = await testController.optOut();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: No active account or subscription ID found for opt-out',
      );
    });
  });

  describe('getCandidateSubscriptionId', () => {
    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return null when feature flag is disabled', async () => {
      // Arrange
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      // Act
      const result = await controller.getCandidateSubscriptionId();

      // Assert
      expect(result).toBeNull();
    });

    it('should fallback to first subscription ID from subscriptions map', async () => {
      // Arrange
      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          activeAccount: {
            account: CAIP_ACCOUNT_1,
            subscriptionId: null, // No active subscription
            hasOptedIn: false,
            lastCheckedAuth: Date.now(),
            lastCheckedAuthError: false,
            perpsFeeDiscount: null,
            lastPerpsDiscountRateFetched: null,
          },
          subscriptions: {
            'fallback-sub-123': {
              id: 'fallback-sub-123',
              referralCode: 'REF123',
              accounts: [],
            },
            'other-sub-456': {
              id: 'other-sub-456',
              referralCode: 'REF456',
              accounts: [],
            },
          },
        },
      });

      // Act
      const result = await testController.getCandidateSubscriptionId();

      // Assert
      expect(result).toBe('fallback-sub-123');
    });

    it('should return null when no subscriptions found and no accounts opted in', async () => {
      // Arrange
      const mockInternalAccounts = [
        {
          address: '0x123',
          type: 'eip155:eoa' as const,
          id: 'account1',
          options: {},
          metadata: {
            name: 'Account 1',
            importTime: Date.now(),
            keyring: { type: 'HD Key Tree' },
          },
          scopes: ['eip155:1' as const],
          methods: [],
        },
        {
          address: '0x456',
          type: 'eip155:eoa' as const,
          id: 'account2',
          options: {},
          metadata: {
            name: 'Account 2',
            importTime: Date.now(),
            keyring: { type: 'HD Key Tree' },
          },
          scopes: ['eip155:1' as const],
          methods: [],
        },
      ];
      const mockOptInResponse = { ois: [false, false] }; // No accounts opted in

      mockMessenger.call
        .mockReturnValueOnce(mockInternalAccounts) // getInternalAccounts
        .mockResolvedValueOnce(mockOptInResponse); // getOptInStatus

      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          activeAccount: null,
          subscriptions: {},
        },
      });

      // Act
      const result = await testController.getCandidateSubscriptionId();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('linkAccountToSubscriptionCandidate', () => {
    const mockInternalAccount = {
      address: '0x123',
      type: 'eip155:eoa' as const,
      id: 'account1',
      options: {},
      metadata: {
        name: 'Test Account',
        importTime: Date.now(),
        keyring: { type: 'HD Key Tree' },
      },
      scopes: ['eip155:1' as const],
      methods: [],
    } as InternalAccount;

    beforeEach(() => {
      jest.clearAllMocks();
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
      mockIsSolanaAddress.mockReturnValue(false); // Default to non-Solana
    });

    it('should return false when feature flag is disabled', async () => {
      // Arrange
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      // Act
      const result = await controller.linkAccountToSubscriptionCandidate(
        mockInternalAccount,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Rewards feature is disabled',
      );
    });

    it('should return false for Solana accounts', async () => {
      // Arrange
      const solanaAccount = {
        ...mockInternalAccount,
        address: 'solana-address',
      };
      mockIsSolanaAddress.mockReturnValue(true);

      // Act
      const result = await controller.linkAccountToSubscriptionCandidate(
        solanaAccount,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Linking Non-EVM accounts to active subscription is not supported',
      );
    });

    it('should return true if account already has subscription', async () => {
      // Arrange
      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          accounts: {
            [CAIP_ACCOUNT_1]: {
              account: CAIP_ACCOUNT_1,
              subscriptionId: 'existing-sub',
              hasOptedIn: true,
              lastCheckedAuth: Date.now(),
              lastCheckedAuthError: false,
              perpsFeeDiscount: null,
              lastPerpsDiscountRateFetched: null,
            },
          },
          subscriptions: {
            'existing-sub': {
              id: 'existing-sub',
              referralCode: 'REF123',
              accounts: [],
            },
          },
        },
      });

      // Act
      const result = await testController.linkAccountToSubscriptionCandidate(
        mockInternalAccount,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Account to link already has subscription',
        {
          account: CAIP_ACCOUNT_1,
          subscriptionId: 'existing-sub',
        },
      );
    });

    it('should throw error when no candidate subscription found', async () => {
      // Arrange
      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          activeAccount: null,
          subscriptions: {},
        },
      });

      // Setup getCandidateSubscriptionId to return null by mocking getInternalAccounts to return empty
      mockMessenger.call.mockReturnValueOnce([]); // getInternalAccounts - empty

      // Act & Assert
      await expect(
        testController.linkAccountToSubscriptionCandidate(mockInternalAccount),
      ).rejects.toThrow('No valid subscription found to link account to');
    });

    it('should successfully link account to subscription', async () => {
      // Arrange
      const mockUpdatedSubscription = {
        id: 'candidate-sub-123',
        referralCode: 'REF456',
        accounts: [{ address: '0x123', chainId: 1 }],
      };

      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          subscriptions: {
            'candidate-sub-123': {
              id: 'candidate-sub-123',
              referralCode: 'REF456',
              accounts: [],
            },
          },
        },
      });

      mockToHex.mockReturnValue('0xsignature');
      mockMessenger.call
        .mockResolvedValueOnce('0xsignature') // signPersonalMessage
        .mockResolvedValueOnce(mockUpdatedSubscription); // mobileJoin

      // Act
      const result = await testController.linkAccountToSubscriptionCandidate(
        mockInternalAccount,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:mobileJoin',
        {
          account: '0x123',
          timestamp: expect.any(Number),
          signature: '0xsignature',
        },
        'candidate-sub-123',
      );

      // Verify account state was updated
      const accountState = testController.state.accounts[CAIP_ACCOUNT_1];
      expect(accountState).toEqual({
        account: CAIP_ACCOUNT_1,
        hasOptedIn: true,
        subscriptionId: 'candidate-sub-123',
        lastCheckedAuth: expect.any(Number),
        lastCheckedAuthError: false,
        perpsFeeDiscount: null,
        lastPerpsDiscountRateFetched: null,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Successfully linked account to subscription',
        {
          account: CAIP_ACCOUNT_1,
          subscriptionId: 'candidate-sub-123',
        },
      );
    });

    it('should handle mobile join errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Mobile join failed');

      const testController = new RewardsController({
        messenger: mockMessenger,
        state: {
          ...getRewardsControllerDefaultState(),
          subscriptions: {
            'candidate-sub-123': {
              id: 'candidate-sub-123',
              referralCode: 'REF456',
              accounts: [],
            },
          },
        },
      });

      // Ensure the account is not detected as Solana
      mockIsSolanaAddress.mockReturnValue(false);
      mockToHex.mockReturnValue('0xsignature');
      mockMessenger.call
        .mockResolvedValueOnce('0xsignature') // signPersonalMessage
        .mockRejectedValueOnce(mockError); // mobileJoin

      // Act
      const result = await testController.linkAccountToSubscriptionCandidate(
        mockInternalAccount,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Failed to link account to subscription',
        CAIP_ACCOUNT_1,
        'candidate-sub-123',
        mockError,
      );
    });
  });

  describe('getOptInStatus', () => {
    const mockParams = { addresses: ['0x123', '0x456'] };
    const mockResponse = { ois: [true, false] };

    beforeEach(() => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
    });

    it('should return false array when feature flag is disabled', async () => {
      // Arrange
      jest.clearAllMocks(); // Clear any calls from initialization
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      // Act
      const result = await controller.getOptInStatus(mockParams);

      // Assert
      expect(result).toEqual({ ois: [false, false] });
    });

    it('should successfully get opt-in status from service', async () => {
      // Arrange
      mockMessenger.call.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getOptInStatus(mockParams);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getOptInStatus',
        mockParams,
      );
    });

    it('should handle service errors and rethrow them', async () => {
      // Arrange
      const mockError = new Error('Service error');
      mockMessenger.call.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(controller.getOptInStatus(mockParams)).rejects.toThrow(
        'Service error',
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Failed to get opt-in status:',
        'Service error',
      );
    });

    it('should handle non-Error objects in catch block', async () => {
      // Arrange
      const mockError = 'String error';
      mockMessenger.call.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(controller.getOptInStatus(mockParams)).rejects.toBe(
        'String error',
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        'RewardsController: Failed to get opt-in status:',
        'String error',
      );
    });

    it('should handle empty addresses array', async () => {
      // Arrange
      const emptyParams = { addresses: [] };
      const emptyResponse = { ois: [] };
      mockMessenger.call.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.getOptInStatus(emptyParams);

      // Assert
      expect(result).toEqual(emptyResponse);
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getOptInStatus',
        emptyParams,
      );
    });

    it('should handle large arrays of addresses', async () => {
      // Arrange
      const largeAddressArray = Array.from(
        { length: 100 },
        (_, i) => `0x${i.toString(16).padStart(40, '0')}`,
      );
      const largeParams = { addresses: largeAddressArray };
      const largeResponse = { ois: Array(100).fill(true) };
      mockMessenger.call.mockResolvedValue(largeResponse);

      // Act
      const result = await controller.getOptInStatus(largeParams);

      // Assert
      expect(result).toEqual(largeResponse);
      expect(result.ois).toHaveLength(100);
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:getOptInStatus',
        largeParams,
      );
    });
  });
});
