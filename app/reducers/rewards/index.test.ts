import { Action } from 'redux';
import rewardsReducer, {
  setActiveTab,
  setSubscriptionId,
  setSeasonStatus,
  setReferralDetails,
  setSeasonStatusLoading,
  resetRewardsState,
  RewardsState,
} from '.';
import {
  SeasonStatusState,
  SubscriptionDto,
} from '../../core/Engine/controllers/rewards-controller/types';

describe('rewardsReducer', () => {
  const initialState: RewardsState = {
    activeTab: 'overview',
    seasonStatusLoading: false,

    referralCode: null,
    refereeCount: 0,
    subscriptionId: null,

    currentTier: null,
    nextTier: null,
    nextTierPointsNeeded: null,

    balanceTotal: 0,
    balanceRefereePortion: 0,
    balanceUpdatedAt: null,

    seasonName: null,
    seasonStartDate: null,
    seasonEndDate: null,
    seasonTiers: [],
  };

  it('should return the initial state', () => {
    // Arrange & Act
    const state = rewardsReducer(undefined, { type: 'unknown' } as Action);

    // Assert
    expect(state).toEqual(
      expect.objectContaining({
        activeTab: 'overview',
        seasonStatusLoading: false,
        referralCode: null,
        refereeCount: 0,
        subscriptionId: null,
        currentTier: null,
        nextTier: null,
        nextTierPointsNeeded: null,
        balanceTotal: 0,
        balanceRefereePortion: 0,
        balanceUpdatedAt: null,
        seasonName: null,
        seasonStartDate: null,
        seasonEndDate: null,
        seasonTiers: [],
      }),
    );
  });

  describe('setActiveTab', () => {
    it('should set active tab to overview', () => {
      // Arrange
      const action = setActiveTab('overview');

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.activeTab).toBe('overview');
    });

    it('should set active tab to activity', () => {
      // Arrange
      const action = setActiveTab('activity');

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.activeTab).toBe('activity');
    });

    it('should set active tab to levels', () => {
      // Arrange
      const action = setActiveTab('levels');

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.activeTab).toBe('levels');
    });

    it('should set active tab to null', () => {
      // Arrange
      const stateWithActiveTab = {
        ...initialState,
        activeTab: 'overview' as const,
      };
      const action = setActiveTab(null);

      // Act
      const state = rewardsReducer(stateWithActiveTab, action);

      // Assert
      expect(state.activeTab).toBe(null);
    });
  });

  describe('setSubscriptionId', () => {
    it('should set subscription id when subscription is provided', () => {
      // Arrange
      const mockSubscription: SubscriptionDto = {
        id: 'sub-123',
        referralCode: 'REF123',
        accounts: [],
      };
      const action = setSubscriptionId(mockSubscription.id);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.subscriptionId).toBe('sub-123');
    });

    it('should set subscription id to null when subscription is null', () => {
      // Arrange
      const stateWithSubscription = {
        ...initialState,
        subscriptionId: 'existing-sub',
      };
      const action = setSubscriptionId(null);

      // Act
      const state = rewardsReducer(stateWithSubscription, action);

      // Assert
      expect(state.subscriptionId).toBe(null);
    });

    it('should handle subscription without id', () => {
      // Arrange
      const mockSubscription = {
        referralCode: 'REF123',
      } as SubscriptionDto;
      const action = setSubscriptionId(mockSubscription.id);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.subscriptionId).toBe(null);
    });
  });

  describe('setSeasonStatus', () => {
    it('should update all season status fields when complete data is provided', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-1',
          name: 'Season 1',
          startDate: new Date('2024-01-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [
            {
              id: 'tier-bronze',
              name: 'Bronze',
              pointsNeeded: 0,
            },
          ],
        },
        balance: {
          total: 1500,
          refereePortion: 300,
          updatedAt: 1714857600000,
        },
        tier: {
          currentTier: {
            id: 'tier-bronze',
            name: 'Bronze',
            pointsNeeded: 0,
          },
          nextTier: {
            id: 'tier-silver',
            name: 'Silver',
            pointsNeeded: 1000,
          },
          nextTierPointsNeeded: 1000,
        },
      } as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonName).toBe('Season 1');
      expect(state.seasonStartDate).toEqual(new Date('2024-01-01'));
      expect(state.seasonEndDate).toEqual(new Date('2024-12-31'));
      expect(state.seasonTiers).toHaveLength(1);
      expect(state.seasonTiers[0].id).toBe('tier-bronze');
      expect(state.balanceTotal).toBe(1500);
      expect(state.balanceRefereePortion).toBe(300);
      expect(state.balanceUpdatedAt).toEqual(new Date(1714857600000));
      expect(state.currentTier?.id).toBe('tier-bronze');
      expect(state.nextTier?.id).toBe('tier-silver');
      expect(state.nextTierPointsNeeded).toBe(1000);
    });

    it('should set fields to null when season status is null', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        seasonName: 'Existing Season',
        seasonStartDate: new Date('2024-01-01'),
        seasonEndDate: new Date('2024-12-31'),
        seasonTiers: [{ id: 'tier-1', name: 'Tier 1', pointsNeeded: 100 }],
        balanceTotal: 1000,
        balanceRefereePortion: 200,
        currentTier: {
          id: 'tier-gold',
          name: 'Gold',
          pointsNeeded: 1000,
        },
        nextTier: null,
        nextTierPointsNeeded: null,
      };
      const action = setSeasonStatus(null);

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.seasonName).toBe(null);
      expect(state.seasonStartDate).toBe(null);
      expect(state.seasonEndDate).toBe(null);
      expect(state.seasonTiers).toEqual([]);
      expect(state.balanceTotal).toBe(null);
      expect(state.balanceRefereePortion).toBe(null);
      expect(state.balanceUpdatedAt).toBe(null);
      expect(state.currentTier).toBe(null);
      expect(state.nextTier).toBe(null);
      expect(state.nextTierPointsNeeded).toBe(null);
    });
  });

  describe('setReferralDetails', () => {
    it('should update referral code when provided', () => {
      // Arrange
      const action = setReferralDetails({ referralCode: 'NEW123' });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.referralCode).toBe('NEW123');
      expect(state.refereeCount).toBe(0); // Should remain unchanged
    });

    it('should update referee count when provided', () => {
      // Arrange
      const action = setReferralDetails({ refereeCount: 5 });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.refereeCount).toBe(5);
      expect(state.referralCode).toBe(null); // Should remain unchanged
    });

    it('should update multiple referral fields when provided', () => {
      // Arrange
      const action = setReferralDetails({
        referralCode: 'MULTI123',
        refereeCount: 10,
      });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.referralCode).toBe('MULTI123');
      expect(state.refereeCount).toBe(10);
    });

    it('should handle empty payload without updating any fields', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        referralCode: 'EXISTING',
        refereeCount: 3,
      };
      const action = setReferralDetails({});

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.referralCode).toBe('EXISTING');
      expect(state.refereeCount).toBe(3);
    });

    it('should handle zero referee count', () => {
      // Arrange
      const stateWithReferees = { ...initialState, refereeCount: 5 };
      const action = setReferralDetails({ refereeCount: 0 });

      // Act
      const state = rewardsReducer(stateWithReferees, action);

      // Assert
      expect(state.refereeCount).toBe(0);
    });
  });

  describe('setSeasonStatusLoading', () => {
    it('should set season status loading to true', () => {
      // Arrange
      const action = setSeasonStatusLoading(true);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonStatusLoading).toBe(true);
    });

    it('should set season status loading to false', () => {
      // Arrange
      const stateWithLoading = { ...initialState, seasonStatusLoading: true };
      const action = setSeasonStatusLoading(false);

      // Act
      const state = rewardsReducer(stateWithLoading, action);

      // Assert
      expect(state.seasonStatusLoading).toBe(false);
    });
  });

  describe('resetRewardsState', () => {
    it('should reset all state to initial values', () => {
      // Arrange
      const stateWithData = {
        activeTab: 'activity' as const,
        seasonStatusLoading: true,
        referralCode: 'TEST123',
        refereeCount: 10,
        subscriptionId: 'sub-456',
        currentTier: {
          id: 'tier-platinum',
          name: 'Platinum',
          pointsNeeded: 1000,
        },
        nextTier: {
          id: 'tier-diamond',
          name: 'Diamond',
          pointsNeeded: 2000,
        },
        nextTierPointsNeeded: 1000,
        balanceTotal: 5000,
        balanceRefereePortion: 1000,
        balanceUpdatedAt: new Date('2024-01-01'),
        seasonName: 'Test Season',
        seasonStartDate: new Date('2024-01-01'),
        seasonEndDate: new Date('2024-12-31'),
        seasonTiers: [{ id: 'tier-1', name: 'Tier 1', pointsNeeded: 100 }],
      };
      const action = resetRewardsState();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state).toEqual(
        expect.objectContaining({
          activeTab: 'overview',
          seasonStatusLoading: false,
          referralCode: null,
          refereeCount: 0,
          subscriptionId: null,
          currentTier: null,
          nextTier: null,
          nextTierPointsNeeded: null,
          balanceTotal: 0,
          balanceRefereePortion: 0,
          balanceUpdatedAt: null,
          seasonName: null,
          seasonStartDate: null,
          seasonEndDate: null,
          seasonTiers: [],
        }),
      );
    });
  });

  describe('persist/REHYDRATE', () => {
    it('should restore state from persisted data', () => {
      // Arrange
      const persistedRewardsState: RewardsState = {
        activeTab: 'activity',
        seasonStatusLoading: true, // This will be reset to false in rehydration
        referralCode: 'PERSISTED123',
        refereeCount: 15,
        subscriptionId: 'persisted-sub',
        currentTier: {
          id: 'tier-diamond',
          name: 'Diamond',
          pointsNeeded: 1000,
        },
        nextTier: null,
        nextTierPointsNeeded: null,
        balanceTotal: 2000,
        balanceRefereePortion: 400,
        balanceUpdatedAt: new Date('2024-05-01'),
        seasonName: 'Persisted Season',
        seasonStartDate: new Date('2024-01-01'),
        seasonEndDate: new Date('2024-12-31'),
        seasonTiers: [{ id: 'tier-1', name: 'Tier 1', pointsNeeded: 100 }],
      };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      // Act
      const state = rewardsReducer(initialState, rehydrateAction);

      // Assert
      expect(state).toEqual(
        expect.objectContaining({
          activeTab: 'activity',
          seasonStatusLoading: false, // Reset to false during rehydration
          referralCode: 'PERSISTED123',
          refereeCount: 15,
          subscriptionId: 'persisted-sub',
          currentTier: {
            id: 'tier-diamond',
            name: 'Diamond',
            pointsNeeded: 1000,
          },
          nextTier: null,
          nextTierPointsNeeded: null,
          balanceTotal: 2000,
          balanceRefereePortion: 400,
          seasonName: 'Persisted Season',
          seasonStartDate: new Date('2024-01-01'),
          seasonEndDate: new Date('2024-12-31'),
          seasonTiers: [{ id: 'tier-1', name: 'Tier 1', pointsNeeded: 100 }],
        }),
      );
    });

    it('should return current state when no rewards data in rehydrate payload', () => {
      // Arrange
      const currentState = { ...initialState, referralCode: 'CURRENT123' };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          someOtherReducer: {},
        },
      };

      // Act
      const state = rewardsReducer(currentState, rehydrateAction);

      // Assert
      expect(state).toEqual(currentState);
    });

    it('should return current state when rehydrate payload is empty', () => {
      // Arrange
      const currentState = { ...initialState, referralCode: 'CURRENT123' };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: undefined,
      };

      // Act
      const state = rewardsReducer(currentState, rehydrateAction);

      // Assert
      expect(state).toEqual(currentState);
    });
  });
});
