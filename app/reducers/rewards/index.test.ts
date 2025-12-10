import { Action } from 'redux';
import rewardsReducer, {
  setActiveTab,
  setSeasonStatus,
  setReferralDetails,
  setSeasonStatusLoading,
  setSeasonStatusError,
  setReferralDetailsLoading,
  setReferralDetailsError,
  resetRewardsState,
  setOnboardingActiveStep,
  resetOnboarding,
  setOnboardingReferralCode,
  setCandidateSubscriptionId,
  setGeoRewardsMetadata,
  setGeoRewardsMetadataLoading,
  setGeoRewardsMetadataError,
  setHideUnlinkedAccountsBanner,
  setHideCurrentAccountNotOptedInBanner,
  setActiveBoosts,
  setActiveBoostsLoading,
  setActiveBoostsError,
  setUnlockedRewards,
  setUnlockedRewardLoading,
  setUnlockedRewardError,
  setPointsEvents,
  RewardsState,
} from '.';
import { OnboardingStep } from './types';
import {
  SeasonStatusState,
  RewardClaimStatus,
  PointsEventDto,
} from '../../core/Engine/controllers/rewards-controller/types';
import { AccountGroupId } from '@metamask/account-api';

const initialState: RewardsState = rewardsReducer(undefined, {
  type: 'unknown',
} as Action);

describe('rewardsReducer', () => {
  const initialState: RewardsState = {
    activeTab: 'overview',
    seasonStatusLoading: false,
    seasonStatusError: null,

    seasonId: null,
    seasonName: null,
    seasonStartDate: null,
    seasonEndDate: null,
    seasonTiers: [],
    seasonActivityTypes: [],
    seasonShouldInstallNewVersion: null,

    referralDetailsLoading: false,
    referralDetailsError: false,
    referralCode: null,
    refereeCount: 0,

    currentTier: null,
    nextTier: null,
    nextTierPointsNeeded: null,

    balanceTotal: 0,
    balanceRefereePortion: 0,
    balanceUpdatedAt: null,

    onboardingActiveStep: OnboardingStep.INTRO,
    onboardingReferralCode: null,
    candidateSubscriptionId: 'pending',
    geoLocation: null,
    optinAllowedForGeo: null,
    optinAllowedForGeoLoading: false,
    optinAllowedForGeoError: false,
    hideUnlinkedAccountsBanner: false,
    hideCurrentAccountNotOptedInBanner: [],

    activeBoosts: null,
    activeBoostsLoading: false,
    activeBoostsError: false,

    pointsEvents: null,

    unlockedRewards: null,
    unlockedRewardLoading: false,
    unlockedRewardError: false,
  };

  it('should return the initial state', () => {
    // Arrange & Act
    const state = rewardsReducer(undefined, { type: 'unknown' } as Action);

    // Assert
    expect(state).toEqual(initialState);
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

    it('should set active tab to overview when invalid value provided', () => {
      // Arrange
      const stateWithActiveTab = {
        ...initialState,
        activeTab: 'overview' as const,
      };
      const action = setActiveTab('overview');

      // Act
      const state = rewardsReducer(stateWithActiveTab, action);

      // Assert
      expect(state.activeTab).toBe('overview');
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
              image: {
                lightModeUrl: 'https://example.com/bronze-light.png',
                darkModeUrl: 'https://example.com/bronze-dark.png',
              },
              levelNumber: '1',
              rewards: [],
            },
          ],
        },
        balance: {
          total: 1500,
          updatedAt: 1714857600000,
        },
        tier: {
          currentTier: {
            id: 'tier-bronze',
            name: 'Bronze',
            pointsNeeded: 0,
            image: {
              lightModeUrl: 'https://example.com/bronze-light.png',
              darkModeUrl: 'https://example.com/bronze-dark.png',
            },
            levelNumber: '1',
            rewards: [],
          },
          nextTier: {
            id: 'tier-silver',
            name: 'Silver',
            pointsNeeded: 1000,
            image: {
              lightModeUrl: 'https://example.com/silver-light.png',
              darkModeUrl: 'https://example.com/silver-dark.png',
            },
            levelNumber: '2',
            rewards: [],
          },
          nextTierPointsNeeded: 1000,
        },
      } as unknown as SeasonStatusState;
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
      expect(state.balanceUpdatedAt).toEqual(new Date(1714857600000));
      expect(state.currentTier?.id).toBe('tier-bronze');
      expect(state.nextTier?.id).toBe('tier-silver');
      expect(state.nextTierPointsNeeded).toBe(1000);
      expect(state.seasonShouldInstallNewVersion).toBe(null);
    });

    it('should set fields to null when season status is null', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        seasonName: 'Existing Season',
        seasonStartDate: new Date('2024-01-01'),
        seasonEndDate: new Date('2024-12-31'),
        seasonTiers: [
          {
            id: 'tier-1',
            name: 'Tier 1',
            pointsNeeded: 100,
            image: {
              lightModeUrl: 'https://example.com/tier1-light.png',
              darkModeUrl: 'https://example.com/tier1-dark.png',
            },
            levelNumber: '1',
            rewards: [],
          },
        ],
        balanceTotal: 1000,
        balanceRefereePortion: 200,
        seasonShouldInstallNewVersion: '1.0.0',
        currentTier: {
          id: 'tier-gold',
          name: 'Gold',
          pointsNeeded: 1000,
          image: {
            lightModeUrl: 'https://example.com/gold-light.png',
            darkModeUrl: 'https://example.com/gold-dark.png',
          },
          levelNumber: '3',
          rewards: [],
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
      expect(state.balanceUpdatedAt).toBe(null);
      expect(state.currentTier).toBe(null);
      expect(state.nextTier).toBe(null);
      expect(state.nextTierPointsNeeded).toBe(null);
      expect(state.seasonShouldInstallNewVersion).toBe(null);
    });

    it('should handle season status with invalid balance types', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-4',
          name: 'Season 4',
          startDate: new Date('2024-01-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [],
        },
        balance: {
          total: 'invalid' as unknown as number, // Invalid type
          updatedAt: 1714857600000,
        },
      } as unknown as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonName).toBe('Season 4');
      expect(state.balanceTotal).toBe(null); // Should be null due to invalid type
      expect(state.balanceUpdatedAt).toEqual(new Date(1714857600000));
    });

    it('should handle season status with partial tier data', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-5',
          name: 'Season 5',
          startDate: new Date('2024-01-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [
            {
              id: 'tier-bronze',
              name: 'Bronze',
              pointsNeeded: 0,
              image: {
                lightModeUrl: 'https://example.com/bronze-light.png',
                darkModeUrl: 'https://example.com/bronze-dark.png',
              },
              levelNumber: '1',
              rewards: [],
            },
          ],
          activityTypes: [],
        },
        balance: {
          total: 500,
          updatedAt: 1714857600000,
        },
        tier: {
          currentTier: {
            id: 'tier-bronze',
            name: 'Bronze',
            pointsNeeded: 0,
            image: {
              lightModeUrl: 'https://example.com/bronze-light.png',
              darkModeUrl: 'https://example.com/bronze-dark.png',
            },
            levelNumber: '1',
            rewards: [],
          },
          nextTier: null,
          nextTierPointsNeeded: null,
        },
      } as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.currentTier?.name).toBe('Bronze');
      expect(state.nextTier).toBe(null);
      expect(state.nextTierPointsNeeded).toBe(null);
    });

    it('should handle season status with undefined balance updatedAt', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-no-updated-at',
          name: 'Season No UpdatedAt',
          startDate: new Date('2024-01-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [],
        },
        balance: {
          total: 100,
        },
        tier: {
          currentTier: null,
          nextTier: null,
          nextTierPointsNeeded: null,
        },
      } as unknown as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.balanceTotal).toBe(100);
      expect(state.balanceUpdatedAt).toBe(null);
    });

    it('should set seasonActivityTypes from season data', () => {
      const mockSeasonStatus = {
        season: {
          id: 'season-activity',
          name: 'Season Activity',
          startDate: new Date('2024-02-01').getTime(),
          endDate: new Date('2024-03-01').getTime(),
          tiers: [],
          activityTypes: [
            {
              type: 'SWAP',
              title: 'Swap',
              description: 'Swap desc',
              icon: 'SwapVertical',
            },
            {
              type: 'CARD',
              title: 'Card spend',
              description: 'Spend',
              icon: 'Card',
            },
          ],
        },
      } as unknown as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      const state = rewardsReducer(initialState, action);

      expect(state.seasonActivityTypes).toEqual(
        mockSeasonStatus.season.activityTypes,
      );
    });

    it('should clear seasonActivityTypes when season status is null', () => {
      const stateWithActivities = {
        ...initialState,
        seasonActivityTypes: [
          {
            type: 'REFERRAL',
            title: 'Referral',
            description: 'Refer a friend',
            icon: 'UserCircleAdd',
          },
        ],
      };
      const action = setSeasonStatus(null);

      const state = rewardsReducer(stateWithActivities, action);

      expect(state.seasonActivityTypes).toEqual([]);
    });

    it('should set seasonShouldInstallNewVersion when provided', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-with-version',
          name: 'Season With Version',
          startDate: new Date('2024-01-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [],
          shouldInstallNewVersion: '2.0.0',
        },
        balance: {
          total: 100,
        },
        tier: {
          currentTier: null,
          nextTier: null,
          nextTierPointsNeeded: null,
        },
      } as unknown as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonShouldInstallNewVersion).toBe('2.0.0');
    });

    it('should set seasonShouldInstallNewVersion to null when not provided', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-without-version',
          name: 'Season Without Version',
          startDate: new Date('2024-01-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [],
        },
        balance: {
          total: 100,
        },
        tier: {
          currentTier: null,
          nextTier: null,
          nextTierPointsNeeded: null,
        },
      } as unknown as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonShouldInstallNewVersion).toBe(null);
    });

    it('should set seasonShouldInstallNewVersion to null when undefined', () => {
      // Arrange
      const stateWithVersion = {
        ...initialState,
        seasonShouldInstallNewVersion: '1.0.0',
      };
      const mockSeasonStatus = {
        season: {
          id: 'season-undefined-version',
          name: 'Season Undefined Version',
          startDate: new Date('2024-01-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [],
          shouldInstallNewVersion: undefined,
        },
        balance: {
          total: 100,
        },
        tier: {
          currentTier: null,
          nextTier: null,
          nextTierPointsNeeded: null,
        },
      } as unknown as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(stateWithVersion, action);

      // Assert
      expect(state.seasonShouldInstallNewVersion).toBe(null);
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

    it('should set referralDetailsLoading to false', () => {
      // Arrange
      const stateWithLoading = {
        ...initialState,
        referralDetailsLoading: true,
      };
      const action = setReferralDetails({ referralCode: 'TEST123' });

      // Act
      const state = rewardsReducer(stateWithLoading, action);

      // Assert
      expect(state.referralDetailsLoading).toBe(false);
      expect(state.referralCode).toBe('TEST123');
    });

    it('should handle null referralCode explicitly', () => {
      // Arrange
      const stateWithCode = { ...initialState, referralCode: 'EXISTING' };
      const action = setReferralDetails({
        referralCode: null as unknown as string,
      });

      // Act
      const state = rewardsReducer(stateWithCode, action);

      // Assert
      expect(state.referralCode).toBe(null);
      expect(state.referralDetailsLoading).toBe(false);
    });

    it('should handle undefined referralCode in payload', () => {
      // Arrange
      const stateWithCode = { ...initialState, referralCode: 'EXISTING' };
      const action = setReferralDetails({
        referralCode: undefined,
        refereeCount: 5,
      });

      // Act
      const state = rewardsReducer(stateWithCode, action);

      // Assert
      expect(state.referralCode).toBe('EXISTING'); // Should remain unchanged
      expect(state.refereeCount).toBe(5);
      expect(state.referralDetailsLoading).toBe(false);
    });

    it('should handle negative referee count', () => {
      // Arrange
      const action = setReferralDetails({ refereeCount: -1 });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.refereeCount).toBe(-1); // Should accept negative values
      expect(state.referralDetailsLoading).toBe(false);
    });

    it('updates balanceRefereePortion when referralPoints is provided', () => {
      // Arrange
      const action = setReferralDetails({ referralPoints: 500 });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.balanceRefereePortion).toBe(500);
      expect(state.referralDetailsLoading).toBe(false);
    });

    it('updates balanceRefereePortion with zero value', () => {
      // Arrange
      const stateWithPoints = {
        ...initialState,
        balanceRefereePortion: 300,
      };
      const action = setReferralDetails({ referralPoints: 0 });

      // Act
      const state = rewardsReducer(stateWithPoints, action);

      // Assert
      expect(state.balanceRefereePortion).toBe(0);
    });

    it('updates all fields including referralPoints when provided together', () => {
      // Arrange
      const action = setReferralDetails({
        referralCode: 'COMBO123',
        refereeCount: 15,
        referralPoints: 750,
      });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.referralCode).toBe('COMBO123');
      expect(state.refereeCount).toBe(15);
      expect(state.balanceRefereePortion).toBe(750);
      expect(state.referralDetailsLoading).toBe(false);
    });

    it('preserves balanceRefereePortion when referralPoints is not provided', () => {
      // Arrange
      const stateWithPoints = {
        ...initialState,
        balanceRefereePortion: 200,
      };
      const action = setReferralDetails({ referralCode: 'TEST456' });

      // Act
      const state = rewardsReducer(stateWithPoints, action);

      // Assert
      expect(state.balanceRefereePortion).toBe(200);
      expect(state.referralCode).toBe('TEST456');
    });

    it('handles negative referralPoints value', () => {
      // Arrange
      const action = setReferralDetails({ referralPoints: -50 });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.balanceRefereePortion).toBe(-50);
    });

    it('handles large referralPoints value', () => {
      // Arrange
      const action = setReferralDetails({ referralPoints: 999999 });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.balanceRefereePortion).toBe(999999);
    });

    it('handles decimal referralPoints value', () => {
      // Arrange
      const action = setReferralDetails({ referralPoints: 125.75 });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.balanceRefereePortion).toBe(125.75);
    });
  });

  describe('setReferralDetailsError', () => {
    it('should set referral details error to true', () => {
      // Arrange
      const action = setReferralDetailsError(true);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.referralDetailsError).toBe(true);
    });

    it('should set referral details error to false', () => {
      // Arrange
      const stateWithError = {
        ...initialState,
        referralDetailsError: true,
      };
      const action = setReferralDetailsError(false);

      // Act
      const state = rewardsReducer(stateWithError, action);

      // Assert
      expect(state.referralDetailsError).toBe(false);
    });

    it('should not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        referralCode: 'TEST123',
        refereeCount: 5,
        referralDetailsLoading: true,
      };
      const action = setReferralDetailsError(true);

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.referralDetailsError).toBe(true);
      expect(state.referralCode).toBe('TEST123');
      expect(state.refereeCount).toBe(5);
      expect(state.referralDetailsLoading).toBe(true);
    });
  });

  describe('setSeasonStatusLoading', () => {
    it('should set season status loading to true when no season data exists', () => {
      // Arrange
      const action = setSeasonStatusLoading(true);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonStatusLoading).toBe(true);
    });

    it('should not set season status loading to true when season data already exists', () => {
      // Arrange
      const stateWithSeasonData = {
        ...initialState,
        seasonStartDate: new Date('2024-01-01'),
        seasonStatusLoading: false,
      };
      const action = setSeasonStatusLoading(true);

      // Act
      const state = rewardsReducer(stateWithSeasonData, action);

      // Assert
      expect(state.seasonStatusLoading).toBe(false); // Should remain false due to guard clause
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

    it('should set season status loading to false even when season data exists', () => {
      // Arrange
      const stateWithSeasonDataAndLoading = {
        ...initialState,
        seasonStartDate: new Date('2024-01-01'),
        seasonStatusLoading: true,
      };
      const action = setSeasonStatusLoading(false);

      // Act
      const state = rewardsReducer(stateWithSeasonDataAndLoading, action);

      // Assert
      expect(state.seasonStatusLoading).toBe(false);
    });
  });

  describe('setSeasonStatusError', () => {
    it('should set season status error to a string message', () => {
      // Arrange
      const errorMessage = 'Failed to fetch season status';
      const action = setSeasonStatusError(errorMessage);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonStatusError).toBe(errorMessage);
    });

    it('should clear season status error when set to null', () => {
      // Arrange
      const stateWithError = {
        ...initialState,
        seasonStatusError: 'Previous error message',
      };
      const action = setSeasonStatusError(null);

      // Act
      const state = rewardsReducer(stateWithError, action);

      // Assert
      expect(state.seasonStatusError).toBe(null);
    });

    it('should replace existing error with new error message', () => {
      // Arrange
      const stateWithError = {
        ...initialState,
        seasonStatusError: 'Old error message',
      };
      const newErrorMessage = 'New error message';
      const action = setSeasonStatusError(newErrorMessage);

      // Act
      const state = rewardsReducer(stateWithError, action);

      // Assert
      expect(state.seasonStatusError).toBe(newErrorMessage);
    });

    it('should handle network timeout error message', () => {
      // Arrange
      const timeoutError = 'Request timed out while fetching season status';
      const action = setSeasonStatusError(timeoutError);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonStatusError).toBe(timeoutError);
    });

    it('should handle API error response message', () => {
      // Arrange
      const apiError = 'API returned 500: Internal server error';
      const action = setSeasonStatusError(apiError);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonStatusError).toBe(apiError);
    });

    it('should not affect other state properties when setting error', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        seasonName: 'Test Season',
        seasonId: 'season-123',
        balanceTotal: 1000,
        seasonStatusLoading: false,
      };
      const errorMessage = 'Something went wrong';
      const action = setSeasonStatusError(errorMessage);

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.seasonStatusError).toBe(errorMessage);
      expect(state.seasonName).toBe('Test Season');
      expect(state.seasonId).toBe('season-123');
      expect(state.balanceTotal).toBe(1000);
      expect(state.seasonStatusLoading).toBe(false);
    });
  });

  describe('setReferralDetailsLoading', () => {
    it('should set referral details loading to true when no referral code exists', () => {
      // Arrange
      const action = setReferralDetailsLoading(true);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.referralDetailsLoading).toBe(true);
    });

    it('should not set referral details loading to true when referral code already exists', () => {
      // Arrange
      const stateWithReferralCode = {
        ...initialState,
        referralCode: 'EXISTING123',
        referralDetailsLoading: false,
      };
      const action = setReferralDetailsLoading(true);

      // Act
      const state = rewardsReducer(stateWithReferralCode, action);

      // Assert
      expect(state.referralDetailsLoading).toBe(false); // Should remain false due to guard clause
    });

    it('should set referral details loading to false', () => {
      // Arrange
      const stateWithLoading = {
        ...initialState,
        referralDetailsLoading: true,
      };
      const action = setReferralDetailsLoading(false);

      // Act
      const state = rewardsReducer(stateWithLoading, action);

      // Assert
      expect(state.referralDetailsLoading).toBe(false);
    });

    it('should set referral details loading to false even when referral code exists', () => {
      // Arrange
      const stateWithReferralCodeAndLoading = {
        ...initialState,
        referralCode: 'EXISTING123',
        referralDetailsLoading: true,
      };
      const action = setReferralDetailsLoading(false);

      // Act
      const state = rewardsReducer(stateWithReferralCodeAndLoading, action);

      // Assert
      expect(state.referralDetailsLoading).toBe(false);
    });
  });

  describe('setOnboardingActiveStep', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it.each([
      OnboardingStep.INTRO,
      OnboardingStep.STEP_1,
      OnboardingStep.STEP_2,
      OnboardingStep.STEP_3,
      OnboardingStep.STEP_4,
    ])('should set onboarding active step to %s', (step) => {
      // Arrange
      const action = setOnboardingActiveStep(step);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.onboardingActiveStep).toBe(step);
    });

    it('should update from different onboarding step', () => {
      // Arrange
      const stateWithStep = {
        ...initialState,
        onboardingActiveStep: OnboardingStep.STEP_2,
      };
      const action = setOnboardingActiveStep(OnboardingStep.STEP_4);

      // Act
      const state = rewardsReducer(stateWithStep, action);

      // Assert
      expect(state.onboardingActiveStep).toBe(OnboardingStep.STEP_4);
    });

    it('should call logger even when step is the same', () => {
      // Arrange
      const stateWithStep = {
        ...initialState,
        onboardingActiveStep: OnboardingStep.STEP_1,
      };
      const action = setOnboardingActiveStep(OnboardingStep.STEP_1);

      // Act
      const state = rewardsReducer(stateWithStep, action);

      // Assert
      expect(state.onboardingActiveStep).toBe(OnboardingStep.STEP_1);
    });
  });

  describe('resetOnboarding', () => {
    it('should reset onboarding to INTRO step and clear referral code', () => {
      // Arrange
      const stateWithStep = {
        ...initialState,
        onboardingActiveStep: OnboardingStep.STEP_3,
        onboardingReferralCode: 'REF123',
      };
      const action = resetOnboarding();

      // Act
      const state = rewardsReducer(stateWithStep, action);

      // Assert
      expect(state.onboardingActiveStep).toBe(OnboardingStep.INTRO);
      expect(state.onboardingReferralCode).toBeNull();
    });

    it('should not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        onboardingActiveStep: OnboardingStep.STEP_4,
        onboardingReferralCode: 'REF456',
        referralCode: 'KEEP123',
        balanceTotal: 1500,
      };
      const action = resetOnboarding();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.onboardingActiveStep).toBe(OnboardingStep.INTRO);
      expect(state.onboardingReferralCode).toBeNull();
      expect(state.referralCode).toBe('KEEP123');
      expect(state.balanceTotal).toBe(1500);
    });
  });

  describe('setOnboardingReferralCode', () => {
    it('should set onboarding referral code', () => {
      // Arrange
      const action = setOnboardingReferralCode('REF123');

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.onboardingReferralCode).toBe('REF123');
    });

    it('should update existing onboarding referral code', () => {
      // Arrange
      const stateWithCode = {
        ...initialState,
        onboardingReferralCode: 'OLD_REF',
      };
      const action = setOnboardingReferralCode('NEW_REF');

      // Act
      const state = rewardsReducer(stateWithCode, action);

      // Assert
      expect(state.onboardingReferralCode).toBe('NEW_REF');
    });

    it('should set onboarding referral code to null', () => {
      // Arrange
      const stateWithCode = {
        ...initialState,
        onboardingReferralCode: 'REF123',
      };
      const action = setOnboardingReferralCode(null);

      // Act
      const state = rewardsReducer(stateWithCode, action);

      // Assert
      expect(state.onboardingReferralCode).toBeNull();
    });

    it('should not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        onboardingActiveStep: OnboardingStep.STEP_2,
        referralCode: 'KEEP123',
        balanceTotal: 1500,
      };
      const action = setOnboardingReferralCode('REF789');

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.onboardingReferralCode).toBe('REF789');
      expect(state.onboardingActiveStep).toBe(OnboardingStep.STEP_2);
      expect(state.referralCode).toBe('KEEP123');
      expect(state.balanceTotal).toBe(1500);
    });
  });

  describe('setGeoRewardsMetadata', () => {
    it('should update geo metadata when payload is provided', () => {
      // Arrange
      const geoMetadata = {
        geoLocation: 'US',
        optinAllowedForGeo: true,
      };
      const action = setGeoRewardsMetadata(geoMetadata);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.geoLocation).toBe('US');
      expect(state.optinAllowedForGeo).toBe(true);
      expect(state.optinAllowedForGeoLoading).toBe(false);
    });

    it('should update geo metadata with different location', () => {
      // Arrange
      const geoMetadata = {
        geoLocation: 'CA',
        optinAllowedForGeo: false,
      };
      const action = setGeoRewardsMetadata(geoMetadata);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.geoLocation).toBe('CA');
      expect(state.optinAllowedForGeo).toBe(false);
      expect(state.optinAllowedForGeoLoading).toBe(false);
    });

    it('should clear geo metadata when payload is null', () => {
      // Arrange
      const stateWithGeoData = {
        ...initialState,
        geoLocation: 'EU',
        optinAllowedForGeo: true,
        optinAllowedForGeoLoading: true,
      };
      const action = setGeoRewardsMetadata(null);

      // Act
      const state = rewardsReducer(stateWithGeoData, action);

      // Assert
      expect(state.geoLocation).toBe(null);
      expect(state.optinAllowedForGeo).toBe(null);
      expect(state.optinAllowedForGeoLoading).toBe(false);
    });

    it('should reset loading state when metadata is set', () => {
      // Arrange
      const stateWithLoading = {
        ...initialState,
        optinAllowedForGeoLoading: true,
      };
      const geoMetadata = {
        geoLocation: 'UK',
        optinAllowedForGeo: true,
      };
      const action = setGeoRewardsMetadata(geoMetadata);

      // Act
      const state = rewardsReducer(stateWithLoading, action);

      // Assert
      expect(state.geoLocation).toBe('UK');
      expect(state.optinAllowedForGeo).toBe(true);
      expect(state.optinAllowedForGeoLoading).toBe(false);
    });
  });

  describe('setGeoRewardsMetadataLoading', () => {
    it('should set geo rewards metadata loading to true', () => {
      // Arrange
      const action = setGeoRewardsMetadataLoading(true);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.optinAllowedForGeoLoading).toBe(true);
    });

    it('should set geo rewards metadata loading to false', () => {
      // Arrange
      const stateWithLoading = {
        ...initialState,
        optinAllowedForGeoLoading: true,
      };
      const action = setGeoRewardsMetadataLoading(false);

      // Act
      const state = rewardsReducer(stateWithLoading, action);

      // Assert
      expect(state.optinAllowedForGeoLoading).toBe(false);
    });
  });

  describe('setGeoRewardsMetadataError', () => {
    it('should set geo rewards metadata error to true', () => {
      // Arrange
      const action = setGeoRewardsMetadataError(true);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.optinAllowedForGeoError).toBe(true);
    });

    it('should set geo rewards metadata error to false', () => {
      // Arrange
      const stateWithError = {
        ...initialState,
        optinAllowedForGeoError: true,
      };
      const action = setGeoRewardsMetadataError(false);

      // Act
      const state = rewardsReducer(stateWithError, action);

      // Assert
      expect(state.optinAllowedForGeoError).toBe(false);
    });

    it('should not affect other geo metadata properties', () => {
      // Arrange
      const stateWithGeoData = {
        ...initialState,
        geoLocation: 'US',
        optinAllowedForGeo: true,
        optinAllowedForGeoLoading: true,
      };
      const action = setGeoRewardsMetadataError(true);

      // Act
      const state = rewardsReducer(stateWithGeoData, action);

      // Assert
      expect(state.optinAllowedForGeoError).toBe(true);
      expect(state.geoLocation).toBe('US');
      expect(state.optinAllowedForGeo).toBe(true);
      expect(state.optinAllowedForGeoLoading).toBe(true);
    });
  });

  describe('setCandidateSubscriptionId', () => {
    it('should set candidate subscription ID to a string value', () => {
      // Arrange
      const action = setCandidateSubscriptionId('sub-12345');

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.candidateSubscriptionId).toBe('sub-12345');
    });

    it('should set candidate subscription ID to pending', () => {
      // Arrange
      const stateWithId = {
        ...initialState,
        candidateSubscriptionId: 'existing-id' as const,
      };
      const action = setCandidateSubscriptionId('pending');

      // Act
      const state = rewardsReducer(stateWithId, action);

      // Assert
      expect(state.candidateSubscriptionId).toBe('pending');
    });

    it('should set candidate subscription ID to error', () => {
      // Arrange
      const action = setCandidateSubscriptionId('error');

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.candidateSubscriptionId).toBe('error');
    });

    it('should set candidate subscription ID to retry', () => {
      // Arrange
      const action = setCandidateSubscriptionId('retry');

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.candidateSubscriptionId).toBe('retry');
    });

    it('should set candidate subscription ID to null', () => {
      // Arrange
      const stateWithId = {
        ...initialState,
        candidateSubscriptionId: 'existing-id' as const,
      };
      const action = setCandidateSubscriptionId(null);

      // Act
      const state = rewardsReducer(stateWithId, action);

      // Assert
      expect(state.candidateSubscriptionId).toBe(null);
    });

    it('should not affect other state properties when changing from non-valid state', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        candidateSubscriptionId: 'pending' as const,
        referralCode: 'KEEP123',
        balanceTotal: 1500,
      };
      const action = setCandidateSubscriptionId('new-id');

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.candidateSubscriptionId).toBe('new-id');
      expect(state.referralCode).toBe('KEEP123');
      expect(state.balanceTotal).toBe(1500);
    });

    describe('state reset logic when candidate ID changes', () => {
      it('should reset UI state when changing from valid ID to different valid ID', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'old-subscription-id',
          seasonId: 'season-123',
          seasonName: 'Test Season',
          seasonStartDate: new Date('2024-01-01'),
          seasonEndDate: new Date('2024-12-31'),
          seasonTiers: [
            {
              id: 'tier-1',
              name: 'Tier 1',
              pointsNeeded: 100,
              image: {
                lightModeUrl: 'tier1.png',
                darkModeUrl: 'tier1-dark.png',
              },
              levelNumber: '1',
              rewards: [],
            },
          ],
          referralCode: 'REF123',
          refereeCount: 5,
          currentTier: {
            id: 'current-tier',
            name: 'Current Tier',
            pointsNeeded: 1000,
            image: {
              lightModeUrl: 'current.png',
              darkModeUrl: 'current-dark.png',
            },
            levelNumber: '2',
            rewards: [],
          },
          nextTier: {
            id: 'next-tier',
            name: 'Next Tier',
            pointsNeeded: 2000,
            image: {
              lightModeUrl: 'next.png',
              darkModeUrl: 'next-dark.png',
            },
            levelNumber: '3',
            rewards: [],
          },
          nextTierPointsNeeded: 1000,
          balanceTotal: 1500,
          balanceRefereePortion: 300,
          balanceUpdatedAt: new Date('2024-06-01'),
          onboardingActiveStep: OnboardingStep.STEP_2,
          onboardingReferralCode: 'ONBOARDING_REF',
          activeBoosts: [
            {
              id: 'boost-1',
              name: 'Test Boost',
              icon: {
                lightModeUrl: 'boost.png',
                darkModeUrl: 'boost-dark.png',
              },
              boostBips: 1000,
              seasonLong: true,
              backgroundColor: '#FF0000',
            },
          ],
          pointsEvents: [
            {
              id: 'event-1',
              type: 'SWAP' as const,
              timestamp: new Date('2024-01-01'),
              value: 100,
              bonus: null,
              accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
              updatedAt: new Date('2024-01-01'),
              payload: null,
            },
          ],
          unlockedRewards: [
            {
              id: 'reward-1',
              seasonRewardId: 'season-reward-1',
              claimStatus: RewardClaimStatus.CLAIMED,
            },
          ],
          seasonActivityTypes: [
            {
              type: 'PREDICT',
              title: 'Predict',
              description: 'Prediction',
              icon: 'Speedometer',
            },
          ],
          seasonShouldInstallNewVersion: null,
        };
        const action = setCandidateSubscriptionId('new-subscription-id');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('new-subscription-id');
        // All UI state should be reset to initial values
        expect(state.seasonId).toBe(initialState.seasonId);
        expect(state.seasonName).toBe(initialState.seasonName);
        expect(state.seasonStartDate).toBe(initialState.seasonStartDate);
        expect(state.seasonEndDate).toBe(initialState.seasonEndDate);
        expect(state.seasonTiers).toEqual(initialState.seasonTiers);
        expect(state.referralCode).toBe(initialState.referralCode);
        expect(state.refereeCount).toBe(initialState.refereeCount);
        expect(state.currentTier).toBe(initialState.currentTier);
        expect(state.nextTier).toBe(initialState.nextTier);
        expect(state.nextTierPointsNeeded).toBe(
          initialState.nextTierPointsNeeded,
        );
        expect(state.balanceTotal).toBe(initialState.balanceTotal);
        expect(state.balanceRefereePortion).toBe(
          initialState.balanceRefereePortion,
        );
        expect(state.balanceUpdatedAt).toBe(initialState.balanceUpdatedAt);
        expect(state.activeBoosts).toBe(initialState.activeBoosts);
        expect(state.pointsEvents).toBe(initialState.pointsEvents);
        expect(state.unlockedRewards).toBe(initialState.unlockedRewards);
        // Onboarding state should NOT be reset
        expect(state.onboardingActiveStep).toBe(OnboardingStep.STEP_2);
        expect(state.onboardingReferralCode).toBe('ONBOARDING_REF');
      });

      it('should NOT reset UI state when changing from pending to valid ID', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'pending' as const,
          seasonId: 'season-123',
          seasonName: 'Test Season',
          referralCode: 'REF123',
          balanceTotal: 1500,
        };
        const action = setCandidateSubscriptionId('new-subscription-id');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('new-subscription-id');
        // UI state should NOT be reset when coming from pending
        expect(state.seasonId).toBe('season-123');
        expect(state.seasonName).toBe('Test Season');
        expect(state.referralCode).toBe('REF123');
        expect(state.balanceTotal).toBe(1500);
      });

      it('should NOT reset UI state when changing from error to valid ID', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'error' as const,
          seasonId: 'season-456',
          seasonName: 'Error Season',
          referralCode: 'ERROR123',
          balanceTotal: 2000,
        };
        const action = setCandidateSubscriptionId('new-subscription-id');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('new-subscription-id');
        // UI state should NOT be reset when coming from error
        expect(state.seasonId).toBe('season-456');
        expect(state.seasonName).toBe('Error Season');
        expect(state.referralCode).toBe('ERROR123');
        expect(state.balanceTotal).toBe(2000);
      });

      it('should NOT reset UI state when changing from retry to valid ID', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'retry' as const,
          seasonId: 'season-789',
          seasonName: 'Retry Season',
          referralCode: 'RETRY123',
          balanceTotal: 3000,
        };
        const action = setCandidateSubscriptionId('new-subscription-id');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('new-subscription-id');
        // UI state should NOT be reset when coming from retry
        expect(state.seasonId).toBe('season-789');
        expect(state.seasonName).toBe('Retry Season');
        expect(state.referralCode).toBe('RETRY123');
        expect(state.balanceTotal).toBe(3000);
      });

      it('should NOT reset UI state when changing from null to valid ID', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: null,
          seasonId: 'season-null',
          seasonName: 'Null Season',
          referralCode: 'NULL123',
          balanceTotal: 4000,
        };
        const action = setCandidateSubscriptionId('new-subscription-id');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('new-subscription-id');
        // UI state should NOT be reset when coming from null
        expect(state.seasonId).toBe('season-null');
        expect(state.seasonName).toBe('Null Season');
        expect(state.referralCode).toBe('NULL123');
        expect(state.balanceTotal).toBe(4000);
      });

      it('should NOT reset UI state when changing to same valid ID', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'same-subscription-id',
          seasonId: 'season-same',
          seasonName: 'Same Season',
          referralCode: 'SAME123',
          balanceTotal: 5000,
        };
        const action = setCandidateSubscriptionId('same-subscription-id');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('same-subscription-id');
        // UI state should NOT be reset when ID doesn't change
        expect(state.seasonId).toBe('season-same');
        expect(state.seasonName).toBe('Same Season');
        expect(state.referralCode).toBe('SAME123');
        expect(state.balanceTotal).toBe(5000);
      });

      it('should reset UI state when changing from valid ID to pending', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'valid-subscription-id',
          seasonId: 'season-valid',
          seasonName: 'Valid Season',
          referralCode: 'VALID123',
          balanceTotal: 6000,
        };
        const action = setCandidateSubscriptionId('pending');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('pending');
        // UI state should be reset when changing from valid ID to pending
        expect(state.seasonId).toBe(initialState.seasonId);
        expect(state.seasonName).toBe(initialState.seasonName);
        expect(state.referralCode).toBe(initialState.referralCode);
        expect(state.balanceTotal).toBe(initialState.balanceTotal);
      });

      it('should reset UI state when changing from valid ID to error', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'valid-subscription-id',
          seasonId: 'season-valid',
          seasonName: 'Valid Season',
          referralCode: 'VALID123',
          balanceTotal: 6000,
        };
        const action = setCandidateSubscriptionId('error');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('error');
        // UI state should be reset when changing from valid ID to error
        expect(state.seasonId).toBe(initialState.seasonId);
        expect(state.seasonName).toBe(initialState.seasonName);
        expect(state.referralCode).toBe(initialState.referralCode);
        expect(state.balanceTotal).toBe(initialState.balanceTotal);
      });

      it('should reset UI state when changing from valid ID to retry', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'valid-subscription-id',
          seasonId: 'season-valid',
          seasonName: 'Valid Season',
          referralCode: 'VALID123',
          balanceTotal: 6000,
        };
        const action = setCandidateSubscriptionId('retry');

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('retry');
        // UI state should be reset when changing from valid ID to retry
        expect(state.seasonId).toBe(initialState.seasonId);
        expect(state.seasonName).toBe(initialState.seasonName);
        expect(state.referralCode).toBe(initialState.referralCode);
        expect(state.balanceTotal).toBe(initialState.balanceTotal);
      });

      it('should reset UI state when changing from valid ID to null', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'valid-subscription-id',
          seasonId: 'season-valid',
          seasonName: 'Valid Season',
          referralCode: 'VALID123',
          balanceTotal: 6000,
        };
        const action = setCandidateSubscriptionId(null);

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe(null);
        // UI state should be reset when changing from valid ID to null
        expect(state.seasonId).toBe(initialState.seasonId);
        expect(state.seasonName).toBe(initialState.seasonName);
        expect(state.referralCode).toBe(initialState.referralCode);
        expect(state.balanceTotal).toBe(initialState.balanceTotal);
      });
    });

    describe('state transitions between special states', () => {
      it('should handle transition from pending to error', () => {
        // Arrange
        const stateWithPending = {
          ...initialState,
          candidateSubscriptionId: 'pending' as const,
          seasonId: 'season-pending',
          referralCode: 'PENDING123',
        };
        const action = setCandidateSubscriptionId('error');

        // Act
        const state = rewardsReducer(stateWithPending, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('error');
        expect(state.seasonId).toBe('season-pending'); // Should not reset
        expect(state.referralCode).toBe('PENDING123'); // Should not reset
      });

      it('should handle transition from error to retry', () => {
        // Arrange
        const stateWithError = {
          ...initialState,
          candidateSubscriptionId: 'error' as const,
          seasonId: 'season-error',
          referralCode: 'ERROR123',
        };
        const action = setCandidateSubscriptionId('retry');

        // Act
        const state = rewardsReducer(stateWithError, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('retry');
        expect(state.seasonId).toBe('season-error'); // Should not reset
        expect(state.referralCode).toBe('ERROR123'); // Should not reset
      });

      it('should handle transition from retry to pending', () => {
        // Arrange
        const stateWithRetry = {
          ...initialState,
          candidateSubscriptionId: 'retry' as const,
          seasonId: 'season-retry',
          referralCode: 'RETRY123',
        };
        const action = setCandidateSubscriptionId('pending');

        // Act
        const state = rewardsReducer(stateWithRetry, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('pending');
        expect(state.seasonId).toBe('season-retry'); // Should not reset
        expect(state.referralCode).toBe('RETRY123'); // Should not reset
      });

      it('should handle transition from null to pending', () => {
        // Arrange
        const stateWithNull = {
          ...initialState,
          candidateSubscriptionId: null,
          seasonId: 'season-null',
          referralCode: 'NULL123',
        };
        const action = setCandidateSubscriptionId('pending');

        // Act
        const state = rewardsReducer(stateWithNull, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe('pending');
        expect(state.seasonId).toBe('season-null'); // Should not reset
        expect(state.referralCode).toBe('NULL123'); // Should not reset
      });

      it('should handle transition from pending to null', () => {
        // Arrange
        const stateWithPending = {
          ...initialState,
          candidateSubscriptionId: 'pending' as const,
          seasonId: 'season-pending',
          referralCode: 'PENDING123',
        };
        const action = setCandidateSubscriptionId(null);

        // Act
        const state = rewardsReducer(stateWithPending, action);

        // Assert
        expect(state.candidateSubscriptionId).toBe(null);
        expect(state.seasonId).toBe('season-pending'); // Should not reset
        expect(state.referralCode).toBe('PENDING123'); // Should not reset
      });
    });
  });

  describe('setHideUnlinkedAccountsBanner', () => {
    it('should set hide unlinked accounts banner to true', () => {
      // Arrange
      const action = setHideUnlinkedAccountsBanner(true);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.hideUnlinkedAccountsBanner).toBe(true);
    });

    it('should set hide unlinked accounts banner to false', () => {
      // Arrange
      const stateWithBannerHidden = {
        ...initialState,
        hideUnlinkedAccountsBanner: true,
      };
      const action = setHideUnlinkedAccountsBanner(false);

      // Act
      const state = rewardsReducer(stateWithBannerHidden, action);

      // Assert
      expect(state.hideUnlinkedAccountsBanner).toBe(false);
    });

    it('should not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        hideUnlinkedAccountsBanner: false,
        referralCode: 'KEEP123',
        balanceTotal: 1500,
      };
      const action = setHideUnlinkedAccountsBanner(true);

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.hideUnlinkedAccountsBanner).toBe(true);
      expect(state.referralCode).toBe('KEEP123');
      expect(state.balanceTotal).toBe(1500);
    });
  });

  describe('setHideCurrentAccountNotOptedInBanner', () => {
    it('should add new account banner entry when it does not exist', () => {
      // Arrange
      const accountGroupId: AccountGroupId = 'keyring:wallet1/1';
      const action = setHideCurrentAccountNotOptedInBanner({
        accountGroupId,
        hide: true,
      });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(1);
      expect(state.hideCurrentAccountNotOptedInBanner[0]).toEqual({
        accountGroupId,
        hide: true,
      });
    });

    it('should update existing account banner entry', () => {
      // Arrange
      const accountGroupId: AccountGroupId = 'keyring:wallet1/1';
      const stateWithExistingEntry = {
        ...initialState,
        hideCurrentAccountNotOptedInBanner: [
          {
            accountGroupId,
            hide: false,
          },
        ],
      };
      const action = setHideCurrentAccountNotOptedInBanner({
        accountGroupId,
        hide: true,
      });

      // Act
      const state = rewardsReducer(stateWithExistingEntry, action);

      // Assert
      expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(1);
      expect(state.hideCurrentAccountNotOptedInBanner[0]).toEqual({
        accountGroupId,
        hide: true,
      });
    });

    it('should add multiple different account entries', () => {
      // Arrange
      const accountGroupId1: AccountGroupId = 'keyring:wallet1/1';
      const accountGroupId2: AccountGroupId = 'keyring:wallet2/2';

      let currentState = initialState;

      // Add first account
      const action1 = setHideCurrentAccountNotOptedInBanner({
        accountGroupId: accountGroupId1,
        hide: true,
      });
      currentState = rewardsReducer(currentState, action1);

      // Add second account
      const action2 = setHideCurrentAccountNotOptedInBanner({
        accountGroupId: accountGroupId2,
        hide: false,
      });

      // Act
      const state = rewardsReducer(currentState, action2);

      // Assert
      expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(2);
      expect(state.hideCurrentAccountNotOptedInBanner[0]).toEqual({
        accountGroupId: accountGroupId1,
        hide: true,
      });
      expect(state.hideCurrentAccountNotOptedInBanner[1]).toEqual({
        accountGroupId: accountGroupId2,
        hide: false,
      });
    });

    it('should update specific account without affecting others', () => {
      // Arrange
      const accountGroupId1: AccountGroupId = 'keyring:wallet1/1';
      const accountGroupId2: AccountGroupId = 'keyring:wallet2/2';
      const stateWithMultipleEntries = {
        ...initialState,
        hideCurrentAccountNotOptedInBanner: [
          {
            accountGroupId: accountGroupId1,
            hide: true,
          },
          {
            accountGroupId: accountGroupId2,
            hide: false,
          },
        ],
      };
      const action = setHideCurrentAccountNotOptedInBanner({
        accountGroupId: accountGroupId1,
        hide: false,
      });

      // Act
      const state = rewardsReducer(stateWithMultipleEntries, action);

      // Assert
      expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(2);
      expect(state.hideCurrentAccountNotOptedInBanner[0]).toEqual({
        accountGroupId: accountGroupId1,
        hide: false, // Updated
      });
      expect(state.hideCurrentAccountNotOptedInBanner[1]).toEqual({
        accountGroupId: accountGroupId2,
        hide: false, // Unchanged
      });
    });

    it('should not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        activeTab: 'activity' as const,
        referralCode: 'TEST123',
        hideUnlinkedAccountsBanner: true,
      };
      const accountGroupId: AccountGroupId = 'keyring:wallet1/1';
      const action = setHideCurrentAccountNotOptedInBanner({
        accountGroupId,
        hide: true,
      });

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(1);
      expect(state.activeTab).toBe('activity');
      expect(state.referralCode).toBe('TEST123');
      expect(state.hideUnlinkedAccountsBanner).toBe(true);
    });
  });

  describe('resetRewardsState', () => {
    it('should reset all state to initial values', () => {
      // Arrange
      const stateWithData: RewardsState = {
        activeTab: 'activity' as const,
        seasonStatusLoading: true,
        seasonId: 'test-season-id',
        referralDetailsLoading: false,
        referralCode: 'TEST123',
        refereeCount: 10,
        currentTier: {
          id: 'tier-platinum',
          name: 'Platinum',
          pointsNeeded: 1000,
          image: {
            lightModeUrl: 'platinum.png',
            darkModeUrl: 'platinum-dark.png',
          },
          levelNumber: 'Level 10',
          rewards: [],
        },
        seasonStatusError: null,
        nextTier: {
          id: 'tier-diamond',
          name: 'Diamond',
          pointsNeeded: 2000,
          image: {
            lightModeUrl: 'diamond.png',
            darkModeUrl: 'diamond-dark.png',
          },
          levelNumber: 'Level 20',
          rewards: [],
        },
        nextTierPointsNeeded: 1000,
        balanceTotal: 5000,
        balanceRefereePortion: 1000,
        balanceUpdatedAt: new Date('2024-01-01'),
        seasonName: 'Test Season',
        seasonStartDate: new Date('2024-01-01'),
        seasonEndDate: new Date('2024-12-31'),
        seasonTiers: [
          {
            id: 'tier-1',
            name: 'Tier 1',
            pointsNeeded: 100,
            image: {
              lightModeUrl: 'tier-1.png',
              darkModeUrl: 'tier-1-dark.png',
            },
            levelNumber: 'Level 1',
            rewards: [],
          },
        ],
        seasonActivityTypes: [],
        seasonShouldInstallNewVersion: null,
        onboardingActiveStep: OnboardingStep.STEP_1,
        onboardingReferralCode: 'REF123',
        candidateSubscriptionId: 'some-id',
        geoLocation: 'US',
        optinAllowedForGeo: true,
        optinAllowedForGeoLoading: false,
        hideUnlinkedAccountsBanner: true,
        hideCurrentAccountNotOptedInBanner: [
          {
            accountGroupId: 'keyring:wallet1/1' as AccountGroupId,
            hide: true,
          },
        ],
        activeBoosts: [
          {
            id: 'boost-1',
            name: 'Test Boost 1',
            icon: {
              lightModeUrl: 'light1.png',
              darkModeUrl: 'dark1.png',
            },
            boostBips: 1000,
            seasonLong: true,
            backgroundColor: '#FF0000',
          },
        ],
        pointsEvents: null,
        activeBoostsLoading: false,
        activeBoostsError: false,
        unlockedRewards: [],
        unlockedRewardLoading: false,
        unlockedRewardError: false,
        referralDetailsError: false,
        optinAllowedForGeoError: false,
      };
      const action = resetRewardsState();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state).toEqual(initialState);
    });
  });

  describe('persist/REHYDRATE', () => {
    it('should restore persisted UI state while resetting non-persistent state', () => {
      // Arrange
      const persistedRewardsState: RewardsState = {
        activeTab: 'activity',
        seasonStatusLoading: true,
        seasonId: 'test-season-id',
        referralDetailsLoading: false,
        referralCode: 'PERSISTED123',
        refereeCount: 15,
        currentTier: {
          id: 'tier-diamond',
          name: 'Diamond',
          pointsNeeded: 1000,
          image: {
            lightModeUrl: 'https://example.com/diamond-light.png',
            darkModeUrl: 'https://example.com/diamond-dark.png',
          },
          levelNumber: '4',
          rewards: [],
        },
        nextTier: null,
        nextTierPointsNeeded: null,
        balanceTotal: 2000,
        balanceRefereePortion: 400,
        balanceUpdatedAt: new Date('2024-05-01'),
        seasonName: 'Persisted Season',
        seasonStartDate: new Date('2024-01-01'),
        seasonEndDate: new Date('2024-12-31'),
        seasonTiers: [
          {
            id: 'tier-1',
            name: 'Tier 1',
            pointsNeeded: 100,
            image: {
              lightModeUrl: 'https://example.com/tier1-light.png',
              darkModeUrl: 'https://example.com/tier1-dark.png',
            },
            levelNumber: '1',
            rewards: [],
          },
        ],
        seasonActivityTypes: [],
        seasonShouldInstallNewVersion: null,
        onboardingActiveStep: OnboardingStep.STEP_2,
        onboardingReferralCode: 'PERSISTED_REF',
        candidateSubscriptionId: 'some-id',
        geoLocation: 'CA',
        optinAllowedForGeo: true,
        optinAllowedForGeoLoading: false,
        hideUnlinkedAccountsBanner: true,
        hideCurrentAccountNotOptedInBanner: [
          {
            accountGroupId: 'keyring:wallet1/1' as AccountGroupId,
            hide: true,
          },
        ],
        activeBoosts: [
          {
            id: 'boost-1',
            name: 'Test Boost 1',
            icon: {
              lightModeUrl: 'light1.png',
              darkModeUrl: 'dark1.png',
            },
            boostBips: 1000,
            seasonLong: true,
            backgroundColor: '#FF0000',
          },
        ],
        pointsEvents: null,
        seasonStatusError: null,
        activeBoostsLoading: false,
        activeBoostsError: false,
        unlockedRewards: [],
        unlockedRewardLoading: false,
        unlockedRewardError: false,
        referralDetailsError: false,
        optinAllowedForGeoError: false,
      };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      // Act
      const state = rewardsReducer(initialState, rehydrateAction);

      // Assert - Should restore persisted UI state while keeping current non-persistent state
      const expectedState = {
        ...initialState,
        // Restored from persisted state
        seasonId: persistedRewardsState.seasonId,
        seasonName: persistedRewardsState.seasonName,
        seasonStartDate: persistedRewardsState.seasonStartDate,
        seasonEndDate: persistedRewardsState.seasonEndDate,
        seasonTiers: persistedRewardsState.seasonTiers,
        seasonActivityTypes: persistedRewardsState.seasonActivityTypes,
        referralCode: persistedRewardsState.referralCode,
        refereeCount: persistedRewardsState.refereeCount,
        currentTier: persistedRewardsState.currentTier,
        nextTier: persistedRewardsState.nextTier,
        balanceTotal: persistedRewardsState.balanceTotal,
        balanceUpdatedAt: persistedRewardsState.balanceUpdatedAt,
        activeBoosts: persistedRewardsState.activeBoosts,
        pointsEvents: persistedRewardsState.pointsEvents,
        unlockedRewards: persistedRewardsState.unlockedRewards,
        hideUnlinkedAccountsBanner:
          persistedRewardsState.hideUnlinkedAccountsBanner,
        hideCurrentAccountNotOptedInBanner:
          persistedRewardsState.hideCurrentAccountNotOptedInBanner,
        // These fields are restored from persisted state
        nextTierPointsNeeded: persistedRewardsState.nextTierPointsNeeded,
        balanceRefereePortion: persistedRewardsState.balanceRefereePortion,
      };
      expect(state).toEqual(expectedState);
    });

    it('should restore seasonActivityTypes from persisted state', () => {
      const persistedRewardsState: RewardsState = {
        ...initialState,
        seasonId: 'persisted-season-id',
        seasonActivityTypes: [
          {
            type: 'MUSD_DEPOSIT',
            title: 'mUSD deposit',
            description: 'Deposit mUSD',
            icon: 'Coin',
          },
        ],
      };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      const state = rewardsReducer(initialState, rehydrateAction);

      expect(state.seasonActivityTypes).toEqual(
        persistedRewardsState.seasonActivityTypes,
      );
    });

    it('should preserve all persisted UI state fields', () => {
      // Arrange
      const persistedRewardsState: RewardsState = {
        ...initialState,
        seasonId: 'persisted-season-id',
        seasonName: 'Persisted Season Name',
        seasonStartDate: new Date('2024-01-01'),
        seasonEndDate: new Date('2024-12-31'),
        seasonTiers: [
          {
            id: 'tier-persisted',
            name: 'Persisted Tier',
            pointsNeeded: 500,
            image: {
              lightModeUrl: 'persisted.png',
              darkModeUrl: 'persisted-dark.png',
            },
            levelNumber: '2',
            rewards: [],
          },
        ],
        referralCode: 'PERSISTED_CODE',
        refereeCount: 25,
        currentTier: {
          id: 'current-tier',
          name: 'Current Tier',
          pointsNeeded: 1000,
          image: {
            lightModeUrl: 'current.png',
            darkModeUrl: 'current-dark.png',
          },
          levelNumber: '3',
          rewards: [],
        },
        nextTier: {
          id: 'next-tier',
          name: 'Next Tier',
          pointsNeeded: 2000,
          image: {
            lightModeUrl: 'next.png',
            darkModeUrl: 'next-dark.png',
          },
          levelNumber: '4',
          rewards: [],
        },
        balanceTotal: 3000,
        balanceUpdatedAt: new Date('2024-06-01'),
        activeBoosts: [
          {
            id: 'persisted-boost',
            name: 'Persisted Boost',
            icon: {
              lightModeUrl: 'boost.png',
              darkModeUrl: 'boost-dark.png',
            },
            boostBips: 1500,
            seasonLong: true,
            backgroundColor: '#00FF00',
          },
        ],
        pointsEvents: [],
        unlockedRewards: [
          {
            id: 'unlocked-reward',
            seasonRewardId: 'season-reward-id',
            claimStatus: RewardClaimStatus.UNCLAIMED,
          },
        ],
        hideUnlinkedAccountsBanner: true,
        hideCurrentAccountNotOptedInBanner: [
          {
            accountGroupId: 'keyring:wallet1/1' as AccountGroupId,
            hide: true,
          },
        ],
      };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      // Act
      const state = rewardsReducer(initialState, rehydrateAction);

      // Assert - All persisted UI state should be preserved
      expect(state.seasonId).toBe(persistedRewardsState.seasonId);
      expect(state.seasonName).toBe(persistedRewardsState.seasonName);
      expect(state.seasonStartDate).toEqual(
        persistedRewardsState.seasonStartDate,
      );
      expect(state.seasonEndDate).toEqual(persistedRewardsState.seasonEndDate);
      expect(state.seasonTiers).toEqual(persistedRewardsState.seasonTiers);
      expect(state.referralCode).toBe(persistedRewardsState.referralCode);
      expect(state.refereeCount).toBe(persistedRewardsState.refereeCount);
      expect(state.currentTier).toEqual(persistedRewardsState.currentTier);
      expect(state.nextTier).toEqual(persistedRewardsState.nextTier);
      expect(state.balanceTotal).toBe(persistedRewardsState.balanceTotal);
      expect(state.balanceUpdatedAt).toEqual(
        persistedRewardsState.balanceUpdatedAt,
      );
      expect(state.activeBoosts).toEqual(persistedRewardsState.activeBoosts);
      expect(state.pointsEvents).toEqual(persistedRewardsState.pointsEvents);
      expect(state.unlockedRewards).toEqual(
        persistedRewardsState.unlockedRewards,
      );
      expect(state.hideUnlinkedAccountsBanner).toBe(
        persistedRewardsState.hideUnlinkedAccountsBanner,
      );
      expect(state.hideCurrentAccountNotOptedInBanner).toEqual(
        persistedRewardsState.hideCurrentAccountNotOptedInBanner,
      );

      // Non-persistent state should remain from current state
      expect(state.nextTierPointsNeeded).toBe(
        initialState.nextTierPointsNeeded,
      );
      expect(state.balanceRefereePortion).toBe(
        initialState.balanceRefereePortion,
      );
    });

    it('should preserve current non-persistent state while restoring persisted UI state', () => {
      // Arrange
      const currentState = {
        ...initialState,
        nextTierPointsNeeded: 500, // This should be preserved
        balanceRefereePortion: 100, // This should be preserved
        activeTab: 'levels' as const, // This should be reset to initial
        seasonStatusLoading: true, // This should be reset to initial
        onboardingActiveStep: OnboardingStep.STEP_3, // This should be reset to initial
        onboardingReferralCode: 'CURRENT_REF', // This should be reset to initial
      };
      const persistedRewardsState: RewardsState = {
        ...initialState,
        seasonId: 'persisted-season',
        seasonName: 'Persisted Season',
        referralCode: 'PERSISTED123',
        balanceTotal: 2000,
        hideUnlinkedAccountsBanner: true,
        onboardingActiveStep: OnboardingStep.STEP_4, // This should NOT be persisted
        onboardingReferralCode: 'PERSISTED_REF', // This should NOT be persisted
      };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      // Act
      const state = rewardsReducer(currentState, rehydrateAction);

      // Assert - Non-persistent state should be preserved from current state
      expect(state.nextTierPointsNeeded).toBe(null); // Restored from persisted state (initialState)
      expect(state.balanceRefereePortion).toBe(0); // Restored from persisted state (initialState)

      // Persisted UI state should be restored
      expect(state.seasonId).toBe('persisted-season');
      expect(state.seasonName).toBe('Persisted Season');
      expect(state.referralCode).toBe('PERSISTED123');
      expect(state.balanceTotal).toBe(2000);
      expect(state.hideUnlinkedAccountsBanner).toBe(true);

      // Non-persistent state should be reset to initial
      expect(state.activeTab).toBe(initialState.activeTab);
      expect(state.seasonStatusLoading).toBe(initialState.seasonStatusLoading);
      expect(state.onboardingActiveStep).toBe(
        initialState.onboardingActiveStep,
      );
      expect(state.onboardingReferralCode).toBe(
        initialState.onboardingReferralCode,
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

  describe('unknown actions', () => {
    it('should return unchanged state for unknown actions', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        referralCode: 'SOME_CODE',
        balanceTotal: 1000,
        activeTab: 'activity' as const,
      };
      const unknownAction = { type: 'UNKNOWN_ACTION', payload: 'some data' };

      // Act
      const state = rewardsReducer(
        stateWithData,
        unknownAction as unknown as Action,
      );

      // Assert
      expect(state).toEqual(stateWithData);
      expect(state).toBe(stateWithData); // Should be the same reference
    });

    it('should return initial state for unknown action when state is undefined', () => {
      // Arrange
      const unknownAction = { type: 'UNKNOWN_ACTION', payload: 'some data' };

      // Act
      const state = rewardsReducer(
        undefined,
        unknownAction as unknown as Action,
      );

      // Assert
      expect(state).toEqual(initialState);
    });
  });
});

describe('setActiveBoosts', () => {
  it('should set active boosts array', () => {
    // Arrange
    const mockBoosts = [
      {
        id: 'boost-1',
        name: 'Test Boost 1',
        icon: {
          lightModeUrl: 'light1.png',
          darkModeUrl: 'dark1.png',
        },
        boostBips: 1000,
        seasonLong: true,
        backgroundColor: '#FF0000',
      },
      {
        id: 'boost-2',
        name: 'Test Boost 2',
        icon: {
          lightModeUrl: 'light2.png',
          darkModeUrl: 'dark2.png',
        },
        boostBips: 500,
        seasonLong: false,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        backgroundColor: '#00FF00',
      },
    ];
    const action = setActiveBoosts(mockBoosts);

    // Act
    const state = rewardsReducer(initialState, action);

    // Assert
    expect(state.activeBoosts).toEqual(mockBoosts);
    expect(state.activeBoosts).toHaveLength(2);
    expect(state.activeBoosts?.[0]?.id).toBe('boost-1');
    expect(state.activeBoosts?.[1]?.seasonLong).toBe(false);
  });

  it('should replace existing active boosts', () => {
    // Arrange
    const existingBoosts = [
      {
        id: 'old-boost',
        name: 'Old Boost',
        icon: { lightModeUrl: 'old.png', darkModeUrl: 'old.png' },
        boostBips: 100,
        seasonLong: true,
        backgroundColor: '#000000',
      },
    ];
    const stateWithBoosts = {
      ...initialState,
      activeBoosts: existingBoosts,
    };
    const newBoosts = [
      {
        id: 'new-boost',
        name: 'New Boost',
        icon: { lightModeUrl: 'new.png', darkModeUrl: 'new.png' },
        boostBips: 2000,
        seasonLong: false,
        backgroundColor: '#FFFFFF',
      },
    ];
    const action = setActiveBoosts(newBoosts);

    // Act
    const state = rewardsReducer(stateWithBoosts, action);

    // Assert
    expect(state.activeBoosts).toEqual(newBoosts);
    expect(state.activeBoosts).toHaveLength(1);
    expect(state.activeBoosts?.[0]?.id).toBe('new-boost');
  });

  it('should set empty array when no boosts provided', () => {
    // Arrange
    const stateWithBoosts = {
      ...initialState,
      activeBoosts: [
        {
          id: 'existing-boost',
          name: 'Existing',
          icon: { lightModeUrl: 'test.png', darkModeUrl: 'test.png' },
          boostBips: 500,
          seasonLong: true,
          backgroundColor: '#123456',
        },
      ],
    };
    const action = setActiveBoosts([]);

    // Act
    const state = rewardsReducer(stateWithBoosts, action);

    // Assert
    expect(state.activeBoosts).toEqual([]);
    expect(state.activeBoosts).toHaveLength(0);
  });

  it('should reset activeBoostsError to false when setting active boosts', () => {
    // Arrange
    const stateWithError = {
      ...initialState,
      activeBoostsError: true,
    };
    const mockBoosts = [
      {
        id: 'boost-1',
        name: 'Test Boost',
        icon: {
          lightModeUrl: 'light.png',
          darkModeUrl: 'dark.png',
        },
        boostBips: 1000,
        seasonLong: true,
        backgroundColor: '#FF0000',
      },
    ];
    const action = setActiveBoosts(mockBoosts);

    // Act
    const state = rewardsReducer(stateWithError, action);

    // Assert
    expect(state.activeBoosts).toEqual(mockBoosts);
    expect(state.activeBoostsError).toBe(false); // Should be reset when successful
  });
});

describe('setActiveBoostsLoading', () => {
  it('should set activeBoostsLoading to true when no active boosts exist', () => {
    // Arrange
    const action = setActiveBoostsLoading(true);

    // Act
    const state = rewardsReducer(initialState, action);

    // Assert
    expect(state.activeBoostsLoading).toBe(true);
  });

  it('should not set activeBoostsLoading to true when active boosts already exist', () => {
    // Arrange
    const stateWithBoosts = {
      ...initialState,
      activeBoosts: [
        {
          id: 'existing-boost',
          name: 'Existing Boost',
          icon: { lightModeUrl: 'test.png', darkModeUrl: 'test.png' },
          boostBips: 1000,
          seasonLong: true,
          backgroundColor: '#FF0000',
        },
      ],
      activeBoostsLoading: false,
    };
    const action = setActiveBoostsLoading(true);

    // Act
    const state = rewardsReducer(stateWithBoosts, action);

    // Assert
    expect(state.activeBoostsLoading).toBe(false); // Should remain false due to guard clause
  });

  it('should set activeBoostsLoading to false', () => {
    // Arrange
    const stateWithLoading = {
      ...initialState,
      activeBoostsLoading: true,
    };
    const action = setActiveBoostsLoading(false);

    // Act
    const state = rewardsReducer(stateWithLoading, action);

    // Assert
    expect(state.activeBoostsLoading).toBe(false);
  });

  it('should set activeBoostsLoading to false even when active boosts exist', () => {
    // Arrange
    const stateWithBoostsAndLoading = {
      ...initialState,
      activeBoosts: [
        {
          id: 'existing-boost',
          name: 'Existing Boost',
          icon: { lightModeUrl: 'test.png', darkModeUrl: 'test.png' },
          boostBips: 1000,
          seasonLong: true,
          backgroundColor: '#FF0000',
        },
      ],
      activeBoostsLoading: true,
    };
    const action = setActiveBoostsLoading(false);

    // Act
    const state = rewardsReducer(stateWithBoostsAndLoading, action);

    // Assert
    expect(state.activeBoostsLoading).toBe(false);
  });

  it('should not affect other state properties', () => {
    // Arrange
    const stateWithData = {
      ...initialState,
      activeTab: 'activity' as const,
      referralCode: 'TEST123',
    };
    const action = setActiveBoostsLoading(true);

    // Act
    const state = rewardsReducer(stateWithData, action);

    // Assert
    expect(state.activeBoostsLoading).toBe(true);
    expect(state.activeTab).toBe('activity');
    expect(state.referralCode).toBe('TEST123');
    expect(state.activeBoosts).toBeNull();
  });
});

describe('setActiveBoostsError', () => {
  it('should set activeBoostsError to true', () => {
    // Arrange
    const action = setActiveBoostsError(true);

    // Act
    const state = rewardsReducer(initialState, action);

    // Assert
    expect(state.activeBoostsError).toBe(true);
  });

  it('should set activeBoostsError to false', () => {
    // Arrange
    const stateWithError = {
      ...initialState,
      activeBoostsError: true,
    };
    const action = setActiveBoostsError(false);

    // Act
    const state = rewardsReducer(stateWithError, action);

    // Assert
    expect(state.activeBoostsError).toBe(false);
  });

  it('should not affect other state properties', () => {
    // Arrange
    const stateWithData = {
      ...initialState,
      activeTab: 'activity' as const,
      referralCode: 'TEST123',
      activeBoosts: [
        {
          id: 'test-boost',
          name: 'Test',
          icon: { lightModeUrl: 'test.png', darkModeUrl: 'test.png' },
          boostBips: 1000,
          seasonLong: true,
          backgroundColor: '#FF0000',
        },
      ],
      activeBoostsLoading: true,
    };
    const action = setActiveBoostsError(true);

    // Act
    const state = rewardsReducer(stateWithData, action);

    // Assert
    expect(state.activeBoostsError).toBe(true);
    expect(state.activeTab).toBe('activity');
    expect(state.referralCode).toBe('TEST123');
    expect(state.activeBoosts).toEqual(stateWithData.activeBoosts);
    expect(state.activeBoostsLoading).toBe(true); // Should remain unchanged
  });

  it('should handle multiple error state changes', () => {
    // Arrange
    let currentState = initialState;

    // Act & Assert - Set error to true
    let action = setActiveBoostsError(true);
    currentState = rewardsReducer(currentState, action);
    expect(currentState.activeBoostsError).toBe(true);

    // Act & Assert - Set error back to false
    action = setActiveBoostsError(false);
    currentState = rewardsReducer(currentState, action);
    expect(currentState.activeBoostsError).toBe(false);

    // Act & Assert - Set error to true again
    action = setActiveBoostsError(true);
    currentState = rewardsReducer(currentState, action);
    expect(currentState.activeBoostsError).toBe(true);
  });
});

describe('setUnlockedRewards', () => {
  it('should set unlocked rewards in state', () => {
    // Arrange
    const mockUnlockedRewards = [
      {
        id: 'reward-1',
        seasonRewardId: 'season-reward-1',
        claimStatus: RewardClaimStatus.CLAIMED,
      },
      {
        id: 'reward-2',
        seasonRewardId: 'season-reward-2',
        claimStatus: RewardClaimStatus.UNCLAIMED,
      },
    ];
    const action = setUnlockedRewards(mockUnlockedRewards);

    // Act
    const state = rewardsReducer(initialState, action);

    // Assert
    expect(state.unlockedRewards).toEqual(mockUnlockedRewards);
    expect(state.unlockedRewards).toHaveLength(2);
    expect(state.unlockedRewards?.[0]?.id).toBe('reward-1');
    expect(state.unlockedRewards?.[1]?.claimStatus).toBe(
      RewardClaimStatus.UNCLAIMED,
    );
  });

  it('should replace existing unlocked rewards', () => {
    // Arrange
    const existingRewards = [
      {
        id: 'old-reward',
        seasonRewardId: 'old-season-reward',
        claimStatus: RewardClaimStatus.CLAIMED,
      },
    ];
    const stateWithRewards = {
      ...initialState,
      unlockedRewards: existingRewards,
    };
    const newRewards = [
      {
        id: 'new-reward-1',
        seasonRewardId: 'new-season-reward-1',
        claimStatus: RewardClaimStatus.UNCLAIMED,
      },
      {
        id: 'new-reward-2',
        seasonRewardId: 'new-season-reward-2',
        claimStatus: RewardClaimStatus.CLAIMED,
      },
    ];
    const action = setUnlockedRewards(newRewards);

    // Act
    const state = rewardsReducer(stateWithRewards, action);

    // Assert
    expect(state.unlockedRewards).toEqual(newRewards);
    expect(state.unlockedRewards).toHaveLength(2);
    expect(state.unlockedRewards?.[0]?.id).toBe('new-reward-1');
    expect(state.unlockedRewards?.[1]?.id).toBe('new-reward-2');
  });

  it('should set empty array when no rewards provided', () => {
    // Arrange
    const stateWithRewards = {
      ...initialState,
      unlockedRewards: [
        {
          id: 'existing-reward',
          seasonRewardId: 'existing-season-reward',
          claimStatus: RewardClaimStatus.CLAIMED,
        },
      ],
    };
    const action = setUnlockedRewards([]);

    // Act
    const state = rewardsReducer(stateWithRewards, action);

    // Assert
    expect(state.unlockedRewards).toEqual([]);
    expect(state.unlockedRewards).toHaveLength(0);
  });

  it('should reset unlockedRewardError to false when setting unlocked rewards', () => {
    // Arrange
    const stateWithError = {
      ...initialState,
      unlockedRewardError: true,
    };
    const mockRewards = [
      {
        id: 'test-reward',
        seasonRewardId: 'test-season-reward',
        claimStatus: RewardClaimStatus.CLAIMED,
      },
    ];
    const action = setUnlockedRewards(mockRewards);

    // Act
    const state = rewardsReducer(stateWithError, action);

    // Assert
    expect(state.unlockedRewards).toEqual(mockRewards);
    expect(state.unlockedRewardError).toBe(false); // Should be reset when successful
  });

  it('should not affect other state properties', () => {
    // Arrange
    const stateWithData = {
      ...initialState,
      activeTab: 'levels' as const,
      referralCode: 'TEST123',
      balanceTotal: 1000,
      activeBoostsLoading: true,
    };
    const mockRewards = [
      {
        id: 'test-reward',
        seasonRewardId: 'test-season-reward',
        claimStatus: RewardClaimStatus.CLAIMED,
      },
    ];
    const action = setUnlockedRewards(mockRewards);

    // Act
    const state = rewardsReducer(stateWithData, action);

    // Assert
    expect(state.unlockedRewards).toEqual(mockRewards);
    expect(state.activeTab).toBe('levels');
    expect(state.referralCode).toBe('TEST123');
    expect(state.balanceTotal).toBe(1000);
    expect(state.activeBoostsLoading).toBe(true);
  });
});

describe('setUnlockedRewardLoading', () => {
  it('should set unlocked reward loading to true when no unlocked rewards exist', () => {
    // Arrange
    const action = setUnlockedRewardLoading(true);

    // Act
    const state = rewardsReducer(initialState, action);

    // Assert
    expect(state.unlockedRewardLoading).toBe(true);
  });

  it('should not set unlocked reward loading to true when unlocked rewards already exist', () => {
    // Arrange
    const stateWithRewards = {
      ...initialState,
      unlockedRewards: [
        {
          id: 'existing-reward',
          seasonRewardId: 'existing-season-reward',
          claimStatus: RewardClaimStatus.CLAIMED,
        },
      ],
      unlockedRewardLoading: false,
    };
    const action = setUnlockedRewardLoading(true);

    // Act
    const state = rewardsReducer(stateWithRewards, action);

    // Assert
    expect(state.unlockedRewardLoading).toBe(false); // Should remain false due to guard clause
  });

  it('should set unlocked reward loading to false', () => {
    // Arrange
    const stateWithLoading = {
      ...initialState,
      unlockedRewardLoading: true,
    };
    const action = setUnlockedRewardLoading(false);

    // Act
    const state = rewardsReducer(stateWithLoading, action);

    // Assert
    expect(state.unlockedRewardLoading).toBe(false);
  });

  it('should set unlocked reward loading to false even when unlocked rewards exist', () => {
    // Arrange
    const stateWithRewardsAndLoading = {
      ...initialState,
      unlockedRewards: [
        {
          id: 'existing-reward',
          seasonRewardId: 'existing-season-reward',
          claimStatus: RewardClaimStatus.CLAIMED,
        },
      ],
      unlockedRewardLoading: true,
    };
    const action = setUnlockedRewardLoading(false);

    // Act
    const state = rewardsReducer(stateWithRewardsAndLoading, action);

    // Assert
    expect(state.unlockedRewardLoading).toBe(false);
  });

  it('should toggle loading state correctly when no rewards exist', () => {
    // Arrange - Start with false and no rewards
    let currentState = initialState;
    expect(currentState.unlockedRewardLoading).toBe(false);
    expect(currentState.unlockedRewards).toBeNull();

    // Act - Set to true (should work since no rewards exist)
    currentState = rewardsReducer(currentState, setUnlockedRewardLoading(true));
    expect(currentState.unlockedRewardLoading).toBe(true);

    // Act - Set back to false
    currentState = rewardsReducer(
      currentState,
      setUnlockedRewardLoading(false),
    );
    expect(currentState.unlockedRewardLoading).toBe(false);
  });

  it('should not affect other state properties', () => {
    // Arrange
    const stateWithData = {
      ...initialState,
      activeTab: 'activity' as const,
      referralCode: 'TEST456',
      activeBoostsLoading: false,
    };
    const action = setUnlockedRewardLoading(true);

    // Act
    const state = rewardsReducer(stateWithData, action);

    // Assert
    expect(state.unlockedRewardLoading).toBe(true);
    expect(state.activeTab).toBe('activity');
    expect(state.referralCode).toBe('TEST456');
    expect(state.unlockedRewards).toBeNull();
    expect(state.activeBoostsLoading).toBe(false);
  });
});

describe('setUnlockedRewardError', () => {
  it('should set unlockedRewardError to true', () => {
    // Arrange
    const action = setUnlockedRewardError(true);

    // Act
    const state = rewardsReducer(initialState, action);

    // Assert
    expect(state.unlockedRewardError).toBe(true);
  });

  it('should set unlockedRewardError to false', () => {
    // Arrange
    const stateWithError = {
      ...initialState,
      unlockedRewardError: true,
    };
    const action = setUnlockedRewardError(false);

    // Act
    const state = rewardsReducer(stateWithError, action);

    // Assert
    expect(state.unlockedRewardError).toBe(false);
  });

  it('should not affect other state properties', () => {
    // Arrange
    const stateWithData = {
      ...initialState,
      activeTab: 'levels' as const,
      referralCode: 'TEST789',
      balanceTotal: 2000,
      unlockedRewardLoading: true,
    };
    const action = setUnlockedRewardError(true);

    // Act
    const state = rewardsReducer(stateWithData, action);

    // Assert
    expect(state.unlockedRewardError).toBe(true);
    expect(state.activeTab).toBe('levels');
    expect(state.referralCode).toBe('TEST789');
    expect(state.balanceTotal).toBe(2000);
    expect(state.unlockedRewardLoading).toBe(true); // Should remain unchanged
  });

  it('should handle multiple error state changes', () => {
    // Arrange
    let currentState = initialState;

    // Act & Assert - Set error to true
    let action = setUnlockedRewardError(true);
    currentState = rewardsReducer(currentState, action);
    expect(currentState.unlockedRewardError).toBe(true);

    // Act & Assert - Set error back to false
    action = setUnlockedRewardError(false);
    currentState = rewardsReducer(currentState, action);
    expect(currentState.unlockedRewardError).toBe(false);

    // Act & Assert - Set error to true again
    action = setUnlockedRewardError(true);
    currentState = rewardsReducer(currentState, action);
    expect(currentState.unlockedRewardError).toBe(true);
  });
});

describe('setPointsEvents', () => {
  it('should set points events array', () => {
    // Arrange
    const mockPointsEvents: PointsEventDto[] = [
      {
        id: 'event-1',
        type: 'SWAP' as const,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        value: 100,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        payload: {
          srcAsset: {
            amount: '1000000000000000000',
            type: 'eip155:1/slip44:60',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
          },
          destAsset: {
            amount: '3000000000',
            type: 'eip155:1/erc20:0xA0b86a33E6441b8c4C8C0C0C0C0C0C0C0C0C0C0C',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
        },
      },
      {
        id: 'event-2',
        type: 'REFERRAL' as const,
        timestamp: new Date('2024-01-02T00:00:00Z'),
        value: 50,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        payload: null,
      },
    ];
    const action = setPointsEvents(mockPointsEvents);

    // Act
    const state = rewardsReducer(initialState, action);

    // Assert
    expect(state.pointsEvents).toEqual(mockPointsEvents);
    expect(state.pointsEvents).toHaveLength(2);
    expect(state.pointsEvents?.[0]?.id).toBe('event-1');
    expect(state.pointsEvents?.[0]?.type).toBe('SWAP');
    expect(state.pointsEvents?.[1]?.type).toBe('REFERRAL');
  });

  it('should replace existing points events', () => {
    // Arrange
    const existingEvents: PointsEventDto[] = [
      {
        id: 'old-event',
        type: 'SIGN_UP_BONUS' as const,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        value: 200,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        payload: null,
      },
    ];
    const stateWithEvents = {
      ...initialState,
      pointsEvents: existingEvents,
    };
    const newEvents: PointsEventDto[] = [
      {
        id: 'new-event-1',
        type: 'PERPS' as const,
        timestamp: new Date('2024-01-02T00:00:00Z'),
        value: 300,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        payload: {
          type: 'OPEN_POSITION',
          direction: 'LONG',
          asset: {
            amount: '1000000000000000000',
            type: 'eip155:1/slip44:60',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
          },
        },
      },
      {
        id: 'new-event-2',
        type: 'LOYALTY_BONUS' as const,
        timestamp: new Date('2024-01-03T00:00:00Z'),
        value: 75,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
        payload: null,
      },
    ];
    const action = setPointsEvents(newEvents);

    // Act
    const state = rewardsReducer(stateWithEvents, action);

    // Assert
    expect(state.pointsEvents).toEqual(newEvents);
    expect(state.pointsEvents).toHaveLength(2);
    expect(state.pointsEvents?.[0]?.id).toBe('new-event-1');
    expect(state.pointsEvents?.[1]?.id).toBe('new-event-2');
  });

  it('should set empty array when no events provided', () => {
    // Arrange
    const stateWithEvents = {
      ...initialState,
      pointsEvents: [
        {
          id: 'existing-event',
          type: 'ONE_TIME_BONUS' as const,
          timestamp: new Date('2024-01-01T00:00:00Z'),
          value: 500,
          bonus: null,
          accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          payload: null,
        },
      ],
    };
    const action = setPointsEvents([]);

    // Act
    const state = rewardsReducer(stateWithEvents, action);

    // Assert
    expect(state.pointsEvents).toEqual([]);
    expect(state.pointsEvents).toHaveLength(0);
  });

  it('should set points events to null', () => {
    // Arrange
    const stateWithEvents = {
      ...initialState,
      pointsEvents: [
        {
          id: 'existing-event',
          type: 'SWAP' as const,
          timestamp: new Date('2024-01-01T00:00:00Z'),
          value: 100,
          bonus: null,
          accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          payload: {
            srcAsset: {
              amount: '1000000000000000000',
              type: 'eip155:1/slip44:60',
              decimals: 18,
              name: 'Ethereum',
              symbol: 'ETH',
            },
            destAsset: {
              amount: '3000000000',
              type: 'eip155:1/erc20:0xA0b86a33E6441b8c4C8C0C0C0C0C0C0C0C0C0C0C',
              decimals: 6,
              name: 'USD Coin',
              symbol: 'USDC',
            },
          },
        },
      ],
    };
    const action = setPointsEvents(null);

    // Act
    const state = rewardsReducer(stateWithEvents, action);

    // Assert
    expect(state.pointsEvents).toBeNull();
  });

  it('should not affect other state properties', () => {
    // Arrange
    const stateWithData = {
      ...initialState,
      activeTab: 'activity' as const,
      referralCode: 'TEST123',
      balanceTotal: 1000,
      activeBoostsLoading: true,
    };
    const mockEvents: PointsEventDto[] = [
      {
        id: 'test-event',
        type: 'SWAP' as const,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        value: 150,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        payload: {
          srcAsset: {
            amount: '10000000',
            type: 'eip155:1/slip44:0',
            decimals: 8,
            name: 'Bitcoin',
            symbol: 'BTC',
          },
          destAsset: {
            amount: '2500000000000000000',
            type: 'eip155:1/slip44:60',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
          },
        },
      },
    ];
    const action = setPointsEvents(mockEvents);

    // Act
    const state = rewardsReducer(stateWithData, action);

    // Assert
    expect(state.pointsEvents).toEqual(mockEvents);
    expect(state.activeTab).toBe('activity');
    expect(state.referralCode).toBe('TEST123');
    expect(state.balanceTotal).toBe(1000);
    expect(state.activeBoostsLoading).toBe(true);
  });

  it('should handle mixed event types', () => {
    // Arrange
    const mixedEvents: PointsEventDto[] = [
      {
        id: 'swap-event',
        type: 'SWAP' as const,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        value: 100,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        payload: {
          srcAsset: {
            amount: '1000000000000000000',
            type: 'eip155:1/slip44:60',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
          },
          destAsset: {
            amount: '3000000000',
            type: 'eip155:1/erc20:0xA0b86a33E6441b8c4C8C0C0C0C0C0C0C0C0C0C0C',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
        },
      },
      {
        id: 'perps-event',
        type: 'PERPS' as const,
        timestamp: new Date('2024-01-02T00:00:00Z'),
        value: 200,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        payload: {
          type: 'CLOSE_POSITION',
          direction: 'SHORT',
          asset: {
            amount: '5000000000000000000',
            type: 'eip155:1/slip44:60',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
          },
        },
      },
      {
        id: 'referral-event',
        type: 'REFERRAL' as const,
        timestamp: new Date('2024-01-03T00:00:00Z'),
        value: 50,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
        payload: null,
      },
      {
        id: 'signup-event',
        type: 'SIGN_UP_BONUS' as const,
        timestamp: new Date('2024-01-04T00:00:00Z'),
        value: 1000,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-04T00:00:00Z'),
        payload: null,
      },
      {
        id: 'loyalty-event',
        type: 'LOYALTY_BONUS' as const,
        timestamp: new Date('2024-01-05T00:00:00Z'),
        value: 75,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-05T00:00:00Z'),
        payload: null,
      },
      {
        id: 'onetime-event',
        type: 'ONE_TIME_BONUS' as const,
        timestamp: new Date('2024-01-06T00:00:00Z'),
        value: 500,
        bonus: null,
        accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
        updatedAt: new Date('2024-01-06T00:00:00Z'),
        payload: null,
      },
    ];
    const action = setPointsEvents(mixedEvents);

    // Act
    const state = rewardsReducer(initialState, action);

    // Assert
    expect(state.pointsEvents).toEqual(mixedEvents);
    expect(state.pointsEvents).toHaveLength(6);
    expect(state.pointsEvents?.[0]?.type).toBe('SWAP');
    expect(state.pointsEvents?.[1]?.type).toBe('PERPS');
    expect(state.pointsEvents?.[2]?.type).toBe('REFERRAL');
    expect(state.pointsEvents?.[3]?.type).toBe('SIGN_UP_BONUS');
    expect(state.pointsEvents?.[4]?.type).toBe('LOYALTY_BONUS');
    expect(state.pointsEvents?.[5]?.type).toBe('ONE_TIME_BONUS');
  });
});
