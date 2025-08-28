import { Action } from 'redux';
import rewardsReducer, {
  setActiveTab,
  setSubscription,
  setSeasonStatus,
  setReferralDetails,
  resetRewardsState,
  RewardsState,
} from '.';
import {
  SeasonStatusDto,
  SubscriptionDto,
} from '../../core/Engine/controllers/rewards-controller/types';

describe('rewardsReducer', () => {
  const initialState: RewardsState = {
    activeTab: null,
    referralCode: null,
    refereeCount: 0,
    subscriptionId: null,
    currentTierId: null,
    balanceTotal: 0,
    balanceRefereePortion: 0,
    balanceUpdatedAt: new Date(),
    seasonStatusLoading: false,
  };

  it('should return the initial state', () => {
    // Arrange & Act
    const state = rewardsReducer(undefined, { type: 'unknown' } as Action);

    // Assert
    expect(state).toEqual(
      expect.objectContaining({
        activeTab: 'overview',
        referralCode: null,
        refereeCount: 0,
        subscriptionId: null,
        currentTierId: null,
        balanceTotal: 0,
        balanceRefereePortion: 0,
        seasonStatusLoading: false,
        balanceUpdatedAt: null,
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

  describe('setSubscription', () => {
    it('should set subscription id when subscription is provided', () => {
      // Arrange
      const mockSubscription: SubscriptionDto = {
        id: 'sub-123',
        referralCode: 'REF123',
      };
      const action = setSubscription(mockSubscription);

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
      const action = setSubscription(null);

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
      const action = setSubscription(mockSubscription);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.subscriptionId).toBe(null);
    });
  });

  describe('setSeasonStatus', () => {
    it('should update all season status fields when complete data is provided', () => {
      // Arrange
      const mockSeasonStatus: SeasonStatusDto = {
        season: {
          id: 'season-1',
          name: 'Season 1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          tiers: [],
        },
        balance: {
          total: 1000,
          refereePortion: 200,
          updatedAt: new Date('2024-06-01'),
        },
        currentTierId: 'tier-gold',
      };
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.balanceTotal).toBe(1000);
      expect(state.balanceRefereePortion).toBe(200);
      expect(state.balanceUpdatedAt).toEqual(new Date('2024-06-01'));
      expect(state.currentTierId).toBe('tier-gold');
    });

    it('should set fields to null when season status is null', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        balanceTotal: 1000,
        balanceRefereePortion: 200,
        currentTierId: 'tier-gold',
      };
      const action = setSeasonStatus(null);

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.balanceTotal).toBe(null);
      expect(state.balanceRefereePortion).toBe(null);
      expect(state.balanceUpdatedAt).toBe(null);
      expect(state.currentTierId).toBe(null);
    });

    it('should handle partial season status with missing balance fields', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-1',
          name: 'Season 1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          tiers: [],
        },
        balance: {
          total: 0,
          refereePortion: 0,
          updatedAt: new Date('2024-01-01'),
        },
        currentTierId: 'tier-bronze',
      } as SeasonStatusDto;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.balanceTotal).toBe(0);
      expect(state.balanceRefereePortion).toBe(0);
      expect(state.currentTierId).toBe('tier-bronze');
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

  describe('resetRewardsState', () => {
    it('should reset all state to initial values', () => {
      // Arrange
      const stateWithData = {
        activeTab: 'overview' as const,
        referralCode: 'TEST123',
        refereeCount: 10,
        subscriptionId: 'sub-456',
        currentTierId: 'tier-platinum',
        balanceTotal: 5000,
        balanceRefereePortion: 1000,
        balanceUpdatedAt: new Date('2024-01-01'),
        seasonStatusLoading: false,
      };
      const action = resetRewardsState();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state).toEqual(
        expect.objectContaining({
          activeTab: 'overview',
          referralCode: null,
          refereeCount: 0,
          subscriptionId: null,
          currentTierId: null,
          balanceTotal: 0,
          balanceRefereePortion: 0,
          seasonStatusLoading: false,
          balanceUpdatedAt: null,
        }),
      );
    });
  });

  describe('persist/REHYDRATE', () => {
    it('should restore state from persisted data', () => {
      // Arrange
      const persistedRewardsState: RewardsState = {
        activeTab: 'activity',
        referralCode: 'PERSISTED123',
        refereeCount: 15,
        subscriptionId: 'persisted-sub',
        currentTierId: 'tier-diamond',
        balanceTotal: 2000,
        balanceRefereePortion: 400,
        balanceUpdatedAt: new Date('2024-05-01'),
        seasonStatusLoading: false,
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
          referralCode: 'PERSISTED123',
          refereeCount: 15,
          subscriptionId: 'persisted-sub',
          currentTierId: 'tier-diamond',
          balanceTotal: 2000,
          balanceRefereePortion: 400,
          seasonStatusLoading: false,
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
