import { RootState } from '../../reducers';
import { RECENT_COMMIT_VALIDITY_WINDOW_MS } from '../../reducers/rewards';
import {
  selectRewardsControllerState,
  selectRewardsSubscriptionId,
  selectRewardsActiveAccountAddress,
  selectRewardsActiveAccountSubscriptionId,
  selectRecentDropPointCommits,
  selectRecentDropPointCommitByDropId,
  selectRecentDropAddressCommits,
  selectRecentDropAddressCommitByDropId,
  selectIsUpdatingDropAddress,
  selectIsValidatingDropAddress,
} from './index';

// Mock rewards controller state
const createMockRewardsControllerState = (overrides = {}) => ({
  activeAccount: null,
  ...overrides,
});

// Mock rewards state
const createMockRewardsState = (overrides = {}) => ({
  candidateSubscriptionId: null,
  hideUnlinkedAccountsBanner: false,
  recentDropPointCommits: {},
  recentDropAddressCommits: {},
  isUpdatingDropAddress: false,
  isValidatingDropAddress: false,
  ...overrides,
});

// Helper to create root state with rewards data
const createMockRootState = (
  rewardsControllerOverrides = {},
  rewardsStateOverrides = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        RewardsController: createMockRewardsControllerState(
          rewardsControllerOverrides,
        ),
      },
    },
    rewards: createMockRewardsState(rewardsStateOverrides),
  }) as RootState;

describe('Rewards Selectors', () => {
  describe('selectRewardsControllerState', () => {
    it('returns the RewardsController state from engine backgroundState', () => {
      // Arrange
      const mockRewardsControllerState = {
        activeAccount: { subscriptionId: 'test-id', hasOptedIn: true },
      };
      const state = createMockRootState(mockRewardsControllerState);

      // Act
      const result = selectRewardsControllerState(state);

      // Assert
      expect(result).toEqual(mockRewardsControllerState);
    });

    it('returns empty state when RewardsController is undefined', () => {
      // Arrange
      const state = {
        engine: {
          backgroundState: {
            RewardsController: undefined,
          },
        },
      } as unknown as RootState;

      // Act
      const result = selectRewardsControllerState(state);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('selectRewardsSubscriptionId', () => {
    it('returns active account subscription ID when available', () => {
      // Arrange
      const activeAccountSubscriptionId = 'active-subscription-id';
      const candidateSubscriptionId = 'candidate-subscription-id';
      const state = createMockRootState(
        {
          activeAccount: {
            subscriptionId: activeAccountSubscriptionId,
            hasOptedIn: true,
          },
        },
        { candidateSubscriptionId },
      );

      // Act
      const result = selectRewardsSubscriptionId(state);

      // Assert
      expect(result).toBe(activeAccountSubscriptionId);
    });

    it('returns candidate subscription ID when active account has no subscription ID', () => {
      // Arrange
      const candidateSubscriptionId = 'candidate-subscription-id';
      const state = createMockRootState(
        {
          activeAccount: {
            subscriptionId: null,
            hasOptedIn: false,
          },
        },
        { candidateSubscriptionId },
      );

      // Act
      const result = selectRewardsSubscriptionId(state);

      // Assert
      expect(result).toBe(candidateSubscriptionId);
    });

    it('returns null when candidate subscription ID is "pending"', () => {
      // Arrange
      const state = createMockRootState(
        {
          activeAccount: {
            subscriptionId: null,
            hasOptedIn: false,
          },
        },
        { candidateSubscriptionId: 'pending' },
      );

      // Act
      const result = selectRewardsSubscriptionId(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when candidate subscription ID is "error"', () => {
      // Arrange
      const state = createMockRootState(
        {
          activeAccount: {
            subscriptionId: null,
            hasOptedIn: false,
          },
        },
        { candidateSubscriptionId: 'error' },
      );

      // Act
      const result = selectRewardsSubscriptionId(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when no active account exists', () => {
      // Arrange
      const candidateSubscriptionId = 'candidate-subscription-id';
      const state = createMockRootState(
        { activeAccount: null },
        { candidateSubscriptionId },
      );

      // Act
      const result = selectRewardsSubscriptionId(state);

      // Assert
      expect(result).toBe(candidateSubscriptionId);
    });

    it('returns null when both subscription IDs are unavailable', () => {
      // Arrange
      const state = createMockRootState(
        { activeAccount: null },
        { candidateSubscriptionId: null },
      );

      // Act
      const result = selectRewardsSubscriptionId(state);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('selectRewardsActiveAccountAddress', () => {
    it('returns the address from CAIP account ID when active account exists', () => {
      // Arrange
      const caipAccountId =
        'eip155:1:0x1234567890abcdef1234567890abcdef12345678';
      const expectedAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const state = createMockRootState({
        activeAccount: {
          account: caipAccountId,
          subscriptionId: 'test-id',
          hasOptedIn: true,
        },
      });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBe(expectedAddress);
    });

    it('returns the address from simple account format', () => {
      // Arrange
      const simpleAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      const state = createMockRootState({
        activeAccount: {
          account: simpleAddress,
          subscriptionId: 'test-id',
          hasOptedIn: true,
        },
      });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBe(simpleAddress);
    });

    it('handles complex CAIP account ID with multiple colons', () => {
      // Arrange
      const complexCaipId =
        'eip155:137:0x9876543210fedcba9876543210fedcba98765432';
      const expectedAddress = '0x9876543210fedcba9876543210fedcba98765432';
      const state = createMockRootState({
        activeAccount: {
          account: complexCaipId,
          subscriptionId: 'test-id',
          hasOptedIn: true,
        },
      });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBe(expectedAddress);
    });

    it('returns null when no active account exists', () => {
      // Arrange
      const state = createMockRootState({ activeAccount: null });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when active account has no account property', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: {
          subscriptionId: 'test-id',
          hasOptedIn: true,
          // account property is missing
        },
      });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when account property is null', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: {
          account: null,
          subscriptionId: 'test-id',
          hasOptedIn: true,
        },
      });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when account property is undefined', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: {
          account: undefined,
          subscriptionId: 'test-id',
          hasOptedIn: true,
        },
      });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null for empty string account', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: {
          account: '',
          subscriptionId: 'test-id',
          hasOptedIn: true,
        },
      });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBeNull();
    });

    it('handles account with single colon', () => {
      // Arrange
      const accountWithColon =
        'prefix:0x1234567890abcdef1234567890abcdef12345678';
      const expectedAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const state = createMockRootState({
        activeAccount: {
          account: accountWithColon,
          subscriptionId: 'test-id',
          hasOptedIn: true,
        },
      });

      // Act
      const result = selectRewardsActiveAccountAddress(state);

      // Assert
      expect(result).toBe(expectedAddress);
    });
  });

  describe('selectRewardsActiveAccountSubscriptionId', () => {
    it('returns subscription ID when active account has subscription', () => {
      // Arrange
      const subscriptionId = 'test-subscription-123';
      const state = createMockRootState({
        activeAccount: {
          account: 'eip155:1:0x123',
          hasOptedIn: true,
          subscriptionId,
          perpsFeeDiscount: null,
          lastPerpsDiscountRateFetched: null,
        },
      });

      // Act
      const result = selectRewardsActiveAccountSubscriptionId(state);

      // Assert
      expect(result).toBe(subscriptionId);
    });

    it('returns null when active account has no subscription', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: {
          account: 'eip155:1:0x123',
          hasOptedIn: false,
          subscriptionId: null,
          perpsFeeDiscount: null,
          lastPerpsDiscountRateFetched: null,
        },
      });

      // Act
      const result = selectRewardsActiveAccountSubscriptionId(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when no active account exists', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: null,
      });

      // Act
      const result = selectRewardsActiveAccountSubscriptionId(state);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('selectRecentDropPointCommits', () => {
    it('returns the recentDropPointCommits map from state', () => {
      // Arrange
      const recentDropPointCommits = {
        'drop-1': {
          response: {
            commitmentId: 'commit-1',
            pointsCommitted: 500,
          },
          committedAt: Date.now(),
        },
      };
      const state = createMockRootState({}, { recentDropPointCommits });

      // Act
      const result = selectRecentDropPointCommits(state);

      // Assert
      expect(result).toEqual(recentDropPointCommits);
    });

    it('returns empty object when no commits exist', () => {
      // Arrange
      const state = createMockRootState();

      // Act
      const result = selectRecentDropPointCommits(state);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('selectRecentDropPointCommitByDropId', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns the commit when it exists and is within the validity window', () => {
      // Arrange
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const commit = {
        response: {
          commitmentId: 'commit-1',
          pointsCommitted: 500,
        },
        committedAt: now - 1000, // 1 second ago
      };
      const state = createMockRootState(
        {},
        { recentDropPointCommits: { 'drop-1': commit } },
      );

      // Act
      const result = selectRecentDropPointCommitByDropId('drop-1')(state);

      // Assert
      expect(result).toEqual(commit);
    });

    it('returns null when the commit has expired beyond the validity window', () => {
      // Arrange
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const commit = {
        response: {
          commitmentId: 'commit-1',
          pointsCommitted: 500,
        },
        committedAt: now - RECENT_COMMIT_VALIDITY_WINDOW_MS, // exactly at boundary
      };
      const state = createMockRootState(
        {},
        { recentDropPointCommits: { 'drop-1': commit } },
      );

      // Act
      const result = selectRecentDropPointCommitByDropId('drop-1')(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when no commit exists for the given drop ID', () => {
      // Arrange
      const state = createMockRootState({}, { recentDropPointCommits: {} });

      // Act
      const result = selectRecentDropPointCommitByDropId('non-existent')(state);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('selectRecentDropAddressCommits', () => {
    it('returns the recentDropAddressCommits map from state', () => {
      // Arrange
      const recentDropAddressCommits = {
        'drop-1': {
          address: '0x1234567890abcdef1234567890abcdef12345678',
          committedAt: Date.now(),
        },
      };
      const state = createMockRootState({}, { recentDropAddressCommits });

      // Act
      const result = selectRecentDropAddressCommits(state);

      // Assert
      expect(result).toEqual(recentDropAddressCommits);
    });

    it('returns empty object when no commits exist', () => {
      // Arrange
      const state = createMockRootState();

      // Act
      const result = selectRecentDropAddressCommits(state);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('selectRecentDropAddressCommitByDropId', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns the commit when it exists and is within the validity window', () => {
      // Arrange
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const commit = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        committedAt: now - 1000, // 1 second ago
      };
      const state = createMockRootState(
        {},
        { recentDropAddressCommits: { 'drop-1': commit } },
      );

      // Act
      const result = selectRecentDropAddressCommitByDropId('drop-1')(state);

      // Assert
      expect(result).toEqual(commit);
    });

    it('returns null when the commit has expired beyond the validity window', () => {
      // Arrange
      const now = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const commit = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        committedAt: now - RECENT_COMMIT_VALIDITY_WINDOW_MS, // exactly at boundary
      };
      const state = createMockRootState(
        {},
        { recentDropAddressCommits: { 'drop-1': commit } },
      );

      // Act
      const result = selectRecentDropAddressCommitByDropId('drop-1')(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when no commit exists for the given drop ID', () => {
      // Arrange
      const state = createMockRootState({}, { recentDropAddressCommits: {} });

      // Act
      const result =
        selectRecentDropAddressCommitByDropId('non-existent')(state);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('selectIsUpdatingDropAddress', () => {
    it('returns false by default', () => {
      // Arrange
      const state = createMockRootState();

      // Act
      const result = selectIsUpdatingDropAddress(state);

      // Assert
      expect(result).toBe(false);
    });

    it('returns true when isUpdatingDropAddress is true', () => {
      // Arrange
      const state = createMockRootState({}, { isUpdatingDropAddress: true });

      // Act
      const result = selectIsUpdatingDropAddress(state);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('selectIsValidatingDropAddress', () => {
    it('returns false by default', () => {
      // Arrange
      const state = createMockRootState();

      // Act
      const result = selectIsValidatingDropAddress(state);

      // Assert
      expect(result).toBe(false);
    });

    it('returns true when isValidatingDropAddress is true', () => {
      // Arrange
      const state = createMockRootState({}, { isValidatingDropAddress: true });

      // Act
      const result = selectIsValidatingDropAddress(state);

      // Assert
      expect(result).toBe(true);
    });
  });
});
