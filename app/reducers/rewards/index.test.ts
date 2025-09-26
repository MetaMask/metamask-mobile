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
  RewardsState,
} from '.';
import { OnboardingStep } from './types';
import {
  SeasonStatusState,
  RewardClaimStatus,
} from '../../core/Engine/controllers/rewards-controller/types';
import { CaipAccountId } from '@metamask/utils';

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
          refereePortion: 300,
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
      expect(state.balanceRefereePortion).toBe(null);
      expect(state.balanceUpdatedAt).toBe(null);
      expect(state.currentTier).toBe(null);
      expect(state.nextTier).toBe(null);
      expect(state.nextTierPointsNeeded).toBe(null);
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
          refereePortion: null as unknown as number, // Invalid type
          updatedAt: 1714857600000,
        },
      } as unknown as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonName).toBe('Season 4');
      expect(state.balanceTotal).toBe(null); // Should be null due to invalid type
      expect(state.balanceRefereePortion).toBe(null); // Should be null due to invalid type
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
        },
        balance: {
          total: 500,
          refereePortion: 100,
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
          refereePortion: 50,
          // No updatedAt property
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
      expect(state.balanceRefereePortion).toBe(50);
      expect(state.balanceUpdatedAt).toBe(null);
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
      it('should reset onboarding to INTRO step', () => {
        // Arrange
        const stateWithStep = {
          ...initialState,
          onboardingActiveStep: OnboardingStep.STEP_3,
        };
        const action = resetOnboarding();

        // Act
        const state = rewardsReducer(stateWithStep, action);

        // Assert
        expect(state.onboardingActiveStep).toBe(OnboardingStep.INTRO);
      });

      it('should not affect other state properties', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          onboardingActiveStep: OnboardingStep.STEP_4,
          referralCode: 'KEEP123',
          balanceTotal: 1500,
        };
        const action = resetOnboarding();

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.onboardingActiveStep).toBe(OnboardingStep.INTRO);
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

      it('should not affect other state properties', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'old-id',
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
        const accountId: CaipAccountId =
          'eip155:1:0x1234567890123456789012345678901234567890';
        const action = setHideCurrentAccountNotOptedInBanner({
          accountId,
          hide: true,
        });

        // Act
        const state = rewardsReducer(initialState, action);

        // Assert
        expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(1);
        expect(state.hideCurrentAccountNotOptedInBanner[0]).toEqual({
          caipAccountId: accountId,
          hide: true,
        });
      });

      it('should update existing account banner entry', () => {
        // Arrange
        const accountId: CaipAccountId =
          'eip155:1:0x1234567890123456789012345678901234567890';
        const stateWithExistingEntry = {
          ...initialState,
          hideCurrentAccountNotOptedInBanner: [
            {
              caipAccountId: accountId,
              hide: false,
            },
          ],
        };
        const action = setHideCurrentAccountNotOptedInBanner({
          accountId,
          hide: true,
        });

        // Act
        const state = rewardsReducer(stateWithExistingEntry, action);

        // Assert
        expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(1);
        expect(state.hideCurrentAccountNotOptedInBanner[0]).toEqual({
          caipAccountId: accountId,
          hide: true,
        });
      });

      it('should add multiple different account entries', () => {
        // Arrange
        const accountId1: CaipAccountId =
          'eip155:1:0x1111111111111111111111111111111111111111';
        const accountId2: CaipAccountId =
          'eip155:1:0x2222222222222222222222222222222222222222';

        let currentState = initialState;

        // Add first account
        const action1 = setHideCurrentAccountNotOptedInBanner({
          accountId: accountId1,
          hide: true,
        });
        currentState = rewardsReducer(currentState, action1);

        // Add second account
        const action2 = setHideCurrentAccountNotOptedInBanner({
          accountId: accountId2,
          hide: false,
        });

        // Act
        const state = rewardsReducer(currentState, action2);

        // Assert
        expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(2);
        expect(state.hideCurrentAccountNotOptedInBanner[0]).toEqual({
          caipAccountId: accountId1,
          hide: true,
        });
        expect(state.hideCurrentAccountNotOptedInBanner[1]).toEqual({
          caipAccountId: accountId2,
          hide: false,
        });
      });

      it('should update specific account without affecting others', () => {
        // Arrange
        const accountId1: CaipAccountId =
          'eip155:1:0x1111111111111111111111111111111111111111';
        const accountId2: CaipAccountId =
          'eip155:1:0x2222222222222222222222222222222222222222';
        const stateWithMultipleEntries = {
          ...initialState,
          hideCurrentAccountNotOptedInBanner: [
            {
              caipAccountId: accountId1,
              hide: true,
            },
            {
              caipAccountId: accountId2,
              hide: false,
            },
          ],
        };
        const action = setHideCurrentAccountNotOptedInBanner({
          accountId: accountId1,
          hide: false,
        });

        // Act
        const state = rewardsReducer(stateWithMultipleEntries, action);

        // Assert
        expect(state.hideCurrentAccountNotOptedInBanner).toHaveLength(2);
        expect(state.hideCurrentAccountNotOptedInBanner[0]).toEqual({
          caipAccountId: accountId1,
          hide: false, // Updated
        });
        expect(state.hideCurrentAccountNotOptedInBanner[1]).toEqual({
          caipAccountId: accountId2,
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
        const accountId: CaipAccountId =
          'eip155:1:0x1234567890123456789012345678901234567890';
        const action = setHideCurrentAccountNotOptedInBanner({
          accountId,
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
          onboardingActiveStep: OnboardingStep.STEP_1,
          candidateSubscriptionId: 'some-id',
          geoLocation: 'US',
          optinAllowedForGeo: true,
          optinAllowedForGeoLoading: false,
          hideUnlinkedAccountsBanner: true,
          hideCurrentAccountNotOptedInBanner: [
            {
              caipAccountId:
                'eip155:1:0x1234567890123456789012345678901234567890' as CaipAccountId,
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
      it('should reset all state to initial values including banner preferences', () => {
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
          onboardingActiveStep: OnboardingStep.STEP_2,
          candidateSubscriptionId: 'some-id',
          geoLocation: 'CA',
          optinAllowedForGeo: true,
          optinAllowedForGeoLoading: false,
          hideUnlinkedAccountsBanner: true, // This will be reset
          hideCurrentAccountNotOptedInBanner: [
            {
              caipAccountId:
                'eip155:1:0x1234567890123456789012345678901234567890' as CaipAccountId,
              hide: true,
            },
          ], // This will be reset
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

        // Assert - All state should be reset to initial values
        const expectedState = {
          ...initialState,
          hideUnlinkedAccountsBanner: false,
          hideCurrentAccountNotOptedInBanner: [],
        };
        expect(state).toEqual(expectedState);
      });

      it('should reset banner preferences regardless of persisted values', () => {
        // Arrange
        const persistedRewardsState: RewardsState = {
          ...initialState,
          referralCode: 'SOME_CODE', // This will be reset
          hideUnlinkedAccountsBanner: true, // This will be reset to false
          hideCurrentAccountNotOptedInBanner: [
            {
              caipAccountId:
                'eip155:1:0x1234567890123456789012345678901234567890' as CaipAccountId,
              hide: true,
            },
          ], // This will be reset to empty array
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
        expect(state.hideUnlinkedAccountsBanner).toBe(false);
        expect(state.hideCurrentAccountNotOptedInBanner).toEqual([]);
        expect(state.referralCode).toBe(null); // Should be reset
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
      currentState = rewardsReducer(
        currentState,
        setUnlockedRewardLoading(true),
      );
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
});
