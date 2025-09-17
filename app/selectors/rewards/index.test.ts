import { RootState } from '../../reducers';
import {
  selectRewardsControllerState,
  selectRewardsSubscriptionId,
  selectRewardsActiveAccountHasOptedIn,
  selectRewardsActiveAccountAddress,
  selectHideUnlinkedAccountsBanner,
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
  } as RootState);

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

  describe('selectRewardsActiveAccountHasOptedIn', () => {
    it('returns true when active account has opted in', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: {
          subscriptionId: 'test-id',
          hasOptedIn: true,
        },
      });

      // Act
      const result = selectRewardsActiveAccountHasOptedIn(state);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false when active account has not opted in', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: {
          subscriptionId: 'test-id',
          hasOptedIn: false,
        },
      });

      // Act
      const result = selectRewardsActiveAccountHasOptedIn(state);

      // Assert
      expect(result).toBe(false);
    });

    it('returns null when no active account exists', () => {
      // Arrange
      const state = createMockRootState({ activeAccount: null });

      // Act
      const result = selectRewardsActiveAccountHasOptedIn(state);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when active account hasOptedIn property is undefined', () => {
      // Arrange
      const state = createMockRootState({
        activeAccount: {
          subscriptionId: 'test-id',
          // hasOptedIn property is missing
        },
      });

      // Act
      const result = selectRewardsActiveAccountHasOptedIn(state);

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

  describe('selectHideUnlinkedAccountsBanner', () => {
    it('returns true when hideUnlinkedAccountsBanner is true', () => {
      // Arrange
      const state = createMockRootState(
        {},
        { hideUnlinkedAccountsBanner: true },
      );

      // Act
      const result = selectHideUnlinkedAccountsBanner(state);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false when hideUnlinkedAccountsBanner is false', () => {
      // Arrange
      const state = createMockRootState(
        {},
        { hideUnlinkedAccountsBanner: false },
      );

      // Act
      const result = selectHideUnlinkedAccountsBanner(state);

      // Assert
      expect(result).toBe(false);
    });
  });
});
