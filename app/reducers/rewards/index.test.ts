import { Action } from 'redux';
import rewardsReducer, {
  setActiveTab,
  setSeasonStatus,
  setReferralDetails,
  setSeasonStatusLoading,
  setReferralDetailsLoading,
  resetRewardsState,
  setOnboardingActiveStep,
  resetOnboarding,
  setCandidateSubscriptionId,
  setGeoRewardsMetadata,
  setGeoRewardsMetadataLoading,
  setHideUnlinkedAccountsBanner,
  setActiveBoosts,
  setActiveBoostsLoading,
  RewardsState,
} from '.';
import { OnboardingStep } from './types';
import { SeasonStatusState } from '../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../util/Logger';

describe('rewardsReducer', () => {
  const initialState: RewardsState = {
    activeTab: 'overview',
    seasonStatusLoading: false,

    seasonId: null,
    seasonName: null,
    seasonStartDate: null,
    seasonEndDate: null,
    seasonTiers: [],

    referralDetailsLoading: false,
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
    optinAllowedForGeo: false,
    optinAllowedForGeoLoading: false,
    hideUnlinkedAccountsBanner: false,

    // Points Boost state
    activeBoosts: [],
    activeBoostsLoading: false,
  };

  it('should return the initial state', () => {
    // Arrange & Act
    const state = rewardsReducer(undefined, { type: 'unknown' } as Action);

    // Assert
    expect(state).toEqual(
      expect.objectContaining({
        activeTab: 'overview',
        seasonStatusLoading: false,
        seasonId: null,
        seasonName: null,
        seasonStartDate: null,
        seasonEndDate: null,
        seasonTiers: [],
        referralDetailsLoading: false,
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
        optinAllowedForGeo: false,
        optinAllowedForGeoLoading: false,
        hideUnlinkedAccountsBanner: false,
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

    it('should handle season status with missing balance data', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-2',
          name: 'Season 2',
          startDate: new Date('2024-01-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [
            {
              id: 'tier-gold',
              name: 'Gold',
              pointsNeeded: 500,
            },
          ],
        },
        tier: {
          currentTier: {
            id: 'tier-silver',
            name: 'Silver',
            pointsNeeded: 100,
          },
          nextTier: null,
          nextTierPointsNeeded: null,
        },
        // No balance property
      } as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonName).toBe('Season 2');
      expect(state.seasonTiers).toHaveLength(1);
      expect(state.currentTier?.name).toBe('Silver');
      expect(state.balanceTotal).toBe(null);
      expect(state.balanceRefereePortion).toBe(null);
      expect(state.balanceUpdatedAt).toBe(null);
    });

    it('should handle season status with missing tier data', () => {
      // Arrange
      const mockSeasonStatus = {
        season: {
          id: 'season-3',
          name: 'Season 3',
          startDate: new Date('2024-06-01').getTime(),
          endDate: new Date('2024-12-31').getTime(),
          tiers: [],
        },
        balance: {
          total: 750,
          refereePortion: 150,
          updatedAt: 1714857600000,
        },
        // No tier property
      } as unknown as SeasonStatusState;
      const action = setSeasonStatus(mockSeasonStatus);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.seasonName).toBe('Season 3');
      expect(state.balanceTotal).toBe(750);
      expect(state.balanceRefereePortion).toBe(150);
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
            },
          ],
        },
        tier: {
          currentTier: {
            id: 'tier-bronze',
            name: 'Bronze',
            pointsNeeded: 0,
          },
          // Missing nextTier and nextTierPointsNeeded
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

    describe('setReferralDetailsLoading', () => {
      it('should set referral details loading to true', () => {
        // Arrange
        const action = setReferralDetailsLoading(true);

        // Act
        const state = rewardsReducer(initialState, action);

        // Assert
        expect(state.referralDetailsLoading).toBe(true);
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
        const loggerSpy = jest.spyOn(Logger, 'log');
        const action = setOnboardingActiveStep(step);

        // Act
        const state = rewardsReducer(initialState, action);

        // Assert
        expect(state.onboardingActiveStep).toBe(step);
        expect(loggerSpy).toHaveBeenCalledWith('setOnboardingActiveStep', step);
      });

      it('should update from different onboarding step', () => {
        // Arrange
        const loggerSpy = jest.spyOn(Logger, 'log');
        const stateWithStep = {
          ...initialState,
          onboardingActiveStep: OnboardingStep.STEP_2,
        };
        const action = setOnboardingActiveStep(OnboardingStep.STEP_4);

        // Act
        const state = rewardsReducer(stateWithStep, action);

        // Assert
        expect(state.onboardingActiveStep).toBe(OnboardingStep.STEP_4);
        expect(loggerSpy).toHaveBeenCalledWith(
          'setOnboardingActiveStep',
          OnboardingStep.STEP_4,
        );
      });

      it('should call logger even when step is the same', () => {
        // Arrange
        const loggerSpy = jest.spyOn(Logger, 'log');
        const stateWithStep = {
          ...initialState,
          onboardingActiveStep: OnboardingStep.STEP_1,
        };
        const action = setOnboardingActiveStep(OnboardingStep.STEP_1);

        // Act
        const state = rewardsReducer(stateWithStep, action);

        // Assert
        expect(state.onboardingActiveStep).toBe(OnboardingStep.STEP_1);
        expect(loggerSpy).toHaveBeenCalledWith(
          'setOnboardingActiveStep',
          OnboardingStep.STEP_1,
        );
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
        expect(state.optinAllowedForGeo).toBe(false);
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
          onboardingActiveStep: OnboardingStep.STEP_1,
          candidateSubscriptionId: 'some-id',
          geoLocation: 'US',
          optinAllowedForGeo: true,
          optinAllowedForGeoLoading: false,
          hideUnlinkedAccountsBanner: true,
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
        };
        const action = resetRewardsState();

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state).toEqual(
          expect.objectContaining({
            activeTab: 'overview',
            seasonId: null,
            seasonStatusLoading: false,
            referralDetailsLoading: false,
            referralCode: null,
            refereeCount: 0,
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
            onboardingActiveStep: OnboardingStep.INTRO,
            candidateSubscriptionId: 'pending',
            geoLocation: null,
            optinAllowedForGeo: false,
            optinAllowedForGeoLoading: false,
            hideUnlinkedAccountsBanner: false,
          }),
        );
      });
    });

    describe('persist/REHYDRATE', () => {
      it('should reset all state to initial values and only restore hideUnlinkedAccountsBanner', () => {
        // Arrange
        const persistedRewardsState: RewardsState = {
          activeTab: 'activity',
          seasonStatusLoading: true,
          seasonId: 'test-season-id',
          seasonName: 'Persisted Season',
          seasonStartDate: new Date('2024-01-01'),
          seasonEndDate: new Date('2024-12-31'),
          seasonTiers: [{ id: 'tier-1', name: 'Tier 1', pointsNeeded: 100 }],
          referralDetailsLoading: false,
          referralCode: 'PERSISTED123',
          refereeCount: 15,
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
          onboardingActiveStep: OnboardingStep.STEP_2,
          candidateSubscriptionId: 'some-id',
          geoLocation: 'CA',
          optinAllowedForGeo: true,
          optinAllowedForGeoLoading: false,
          hideUnlinkedAccountsBanner: true, // This should be preserved
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
        };
        const rehydrateAction = {
          type: 'persist/REHYDRATE',
          payload: {
            rewards: persistedRewardsState,
          },
        };

        // Act
        const state = rewardsReducer(initialState, rehydrateAction);

        // Assert - All state should be reset to initial except hideUnlinkedAccountsBanner
        expect(state).toEqual(
          expect.objectContaining({
            activeTab: 'overview', // Reset to initial
            seasonStatusLoading: false, // Reset to initial
            seasonId: null, // Reset to initial
            seasonName: null, // Reset to initial
            seasonStartDate: null, // Reset to initial
            seasonEndDate: null, // Reset to initial
            seasonTiers: [], // Reset to initial
            referralDetailsLoading: false, // Reset to initial
            referralCode: null, // Reset to initial
            refereeCount: 0, // Reset to initial
            currentTier: null, // Reset to initial
            nextTier: null, // Reset to initial
            nextTierPointsNeeded: null, // Reset to initial
            balanceTotal: 0, // Reset to initial
            balanceRefereePortion: 0, // Reset to initial
            balanceUpdatedAt: null, // Reset to initial
            onboardingActiveStep: OnboardingStep.INTRO, // Reset to initial
            candidateSubscriptionId: 'pending', // Reset to initial
            geoLocation: null, // Reset to initial
            optinAllowedForGeo: false, // Reset to initial
            optinAllowedForGeoLoading: false, // Reset to initial
            hideUnlinkedAccountsBanner: true, // Only this should be preserved
          }),
        );
      });

      it('should handle rehydration with hideUnlinkedAccountsBanner false', () => {
        // Arrange
        const persistedRewardsState: RewardsState = {
          ...initialState,
          referralCode: 'SOME_CODE', // This will be reset
          hideUnlinkedAccountsBanner: false, // This should be preserved
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
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          backgroundColor: '#00FF00',
        },
      ];
      const action = setActiveBoosts(mockBoosts);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.activeBoosts).toEqual(mockBoosts);
      expect(state.activeBoosts).toHaveLength(2);
      expect(state.activeBoosts[0].id).toBe('boost-1');
      expect(state.activeBoosts[1].seasonLong).toBe(false);
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
      expect(state.activeBoosts[0].id).toBe('new-boost');
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
  });

  describe('setActiveBoostsLoading', () => {
    it('should set activeBoostsLoading to true', () => {
      // Arrange
      const action = setActiveBoostsLoading(true);

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.activeBoostsLoading).toBe(true);
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
      };
      const action = setActiveBoostsLoading(true);

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.activeBoostsLoading).toBe(true);
      expect(state.activeTab).toBe('activity');
      expect(state.referralCode).toBe('TEST123');
      expect(state.activeBoosts).toEqual(stateWithData.activeBoosts);
    });
  });
});
