import { RootState } from '../../reducers';
import {
  selectRewardsControllerState,
  selectRewardsSubscriptionId,
  selectRewardsActiveAccountHasOptedIn,
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
