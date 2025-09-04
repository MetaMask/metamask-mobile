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
jest.mock('./utils/multi-subscription-token-vault');
jest.mock('../../../../util/Logger');
jest.mock('../../../../selectors/featureFlagController/rewards');
jest.mock('../../../../store');
jest.mock('../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

// Import mocked modules
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { store } from '../../../../store';

// Type the mocked modules
const mockSelectRewardsEnabledFlag =
  selectRewardsEnabledFlag as jest.MockedFunction<
    typeof selectRewardsEnabledFlag
  >;
const mockStore = store as jest.Mocked<typeof store>;

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
        lastAuthenticatedAccount: {
          account: CAIP_ACCOUNT_1,
          hasOptedIn: true,
          subscriptionId: 'test',
          lastAuthTime: Date.now(),
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
        lastAuthTime: Date.now(),
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: null,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('should return cached hasOptedIn value when cache is fresh', async () => {
      const recentTime = Date.now() - 60000; // 1 minute ago
      const accountState = {
        account: CAIP_ACCOUNT_1,
        hasOptedIn: true,
        subscriptionId: 'test',
        lastAuthTime: Date.now(),
        perpsFeeDiscount: 5.0,
        lastPerpsDiscountRateFetched: recentTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
        lastAuthTime: Date.now(),
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: recentTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
        lastAuthTime: Date.now(),
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: staleTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
        lastAuthTime: Date.now(),
        perpsFeeDiscount: 0,
        lastPerpsDiscountRateFetched: staleTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
        lastAuthTime: Date.now(),
        perpsFeeDiscount: null,
        lastPerpsDiscountRateFetched: null,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
        lastAuthTime: Date.now(),
        perpsFeeDiscount: 7.5,
        lastPerpsDiscountRateFetched: recentTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
        lastAuthTime: Date.now(),
        perpsFeeDiscount: 7.5,
        lastPerpsDiscountRateFetched: staleTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
        lastAuthTime: Date.now(),
        perpsFeeDiscount: 7.5,
        lastPerpsDiscountRateFetched: staleTime,
      };

      controller = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: null,
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
      expect(newAccountState.lastAuthTime).toBe(0);
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
        lastAuthenticatedAccount: null,
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
          lastAuthenticatedAccount: null,
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
          lastAuthenticatedAccount: null,
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
          lastAuthenticatedAccount: null,
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
          lastAuthenticatedAccount: null,
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
          lastAuthenticatedAccount: null,
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
          lastAuthenticatedAccount: null,
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
          lastAuthenticatedAccount: null,
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
});
