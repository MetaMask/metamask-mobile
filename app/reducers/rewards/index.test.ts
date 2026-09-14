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
  setBenefits,
  setBenefitsError,
  setBenefitsLoading,
  setVipDashboard,
  setVipDashboardError,
  setVipDashboardLoading,
  setVipRefereeDashboard,
  setVipRefereeDashboardError,
  setVipRefereeDashboardLoading,
  acceptVipInvite,
  acceptVipRefereeInvite,
  setCampaigns,
  setCampaignsLoading,
  setCampaignsError,
  setCampaignParticipantStatus,
  setPendingMasSeriesOptIn,
  clearPendingMasSeriesOptIn,
  setOndoCampaignLeaderboard,
  setOndoCampaignLeaderboardLoading,
  setOndoCampaignLeaderboardError,
  setOndoCampaignLeaderboardSelectedTier,
  setOndoCampaignLeaderboardPosition,
  setOndoCampaignPortfolioPosition,
  setOndoCampaignActivity,
  setVipTransactions,
  setOndoCampaignDeposits,
  setOndoCampaignDepositsLoading,
  setOndoCampaignDepositsError,
  setPerpsTradingCampaignLeaderboard,
  setPerpsTradingCampaignLeaderboardLoading,
  setPerpsTradingCampaignLeaderboardError,
  setPerpsTradingCampaignLeaderboardPosition,
  setPerpsTradingCampaignVolume,
  setPerpsTradingCampaignVolumeLoading,
  setPerpsTradingCampaignVolumeError,
  setPredictThePitchLeaderboard,
  setPredictThePitchLeaderboardLoading,
  setPredictThePitchLeaderboardError,
  setPredictThePitchLeaderboardPosition,
  setPredictThePitchPositions,
  setPredictThePitchPrizePool,
  setPredictThePitchPrizePoolLoading,
  setPredictThePitchPrizePoolError,
  setPerpsTradingCampaignPrizePool,
  setPerpsTradingCampaignPrizePoolLoading,
  setPerpsTradingCampaignPrizePoolError,
  bulkLinkStarted,
  bulkLinkAccountResult,
  bulkLinkCompleted,
  bulkLinkCancelled,
  bulkLinkSubscriptionChanged,
  bulkLinkReset,
  bulkLinkResumed,
  BULK_LINK_CANCEL,
  setVersionGuardMinimumMobileVersion,
  setVersionGuardLoading,
  setVersionGuardError,
  dismissCampaignOutcomeToast,
  subscribeCampaignReminder,
  markFirstPredictionOnUsOfferViewed,
  markFirstPredictionOnUsSkipped,
  markFirstPredictionOnUsOutcomeOpened,
  markFirstPredictionOnUsOrderConfirmed,
  markFirstPredictionOnUsOrderExecuted,
  markFirstPredictionOnUsOrderFailed,
  RewardsState,
} from '.';
import { OnboardingStep } from './types';
import {
  SeasonStatusState,
  RewardClaimStatus,
  PointsEventDto,
  CampaignDto,
  CampaignType,
  CampaignLeaderboardDto,
  CampaignLeaderboardPositionDto,
  OndoGmPortfolioDto,
  OndoGmActivityEntryDto,
  PerpsTradingCampaignLeaderboardDto,
  PerpsTradingCampaignLeaderboardPositionDto,
  PerpsTradingCampaignVolumeDto,
  PredictThePitchLeaderboardDto,
  PredictThePitchLeaderboardPositionDto,
  PredictThePitchPositionsDto,
  PredictThePitchPrizePoolDto,
  PerpsTradingCampaignPrizePoolDto,
  VipDashboardState,
  VipTransactionDto,
} from '../../core/Engine/controllers/rewards-controller/types';
import { AccountGroupId } from '@metamask/account-api';
import { brandColor } from '@metamask/design-tokens';

const initialState: RewardsState = rewardsReducer(undefined, {
  type: 'unknown',
} as Action);

const TEST_SUBSCRIPTION_ID = 'test-subscription-id';
const seasonUserKey = (
  seasonId: string,
  subscriptionId = TEST_SUBSCRIPTION_ID,
) => `${seasonId}:${subscriptionId}`;

const preservedReferralDetails = (referralCode: string) => ({
  [TEST_SUBSCRIPTION_ID]: {
    referralCode,
    refereeCount: 0,
    referredByCode: null as string | null,
    isVipReferee: false,
    referredByVipCode: null as string | null,
    loading: false,
    error: false,
  },
});

const preservedSeasonUserStatuses = (balanceTotal: number) => ({
  [seasonUserKey('season-1')]: {
    balanceTotal,
    balanceUpdatedAt: null as Date | null,
    currentTier: null,
    nextTier: null,
    nextTierPointsNeeded: null as number | null,
    loading: false,
    error: null as string | null,
  },
});

describe('rewardsReducer', () => {
  it('returns the initial state', () => {
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
    it('writes season catalog globally and user status under composite key', () => {
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
          activityTypes: [],
          waysToEarn: [],
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

      const state = rewardsReducer(
        initialState,
        setSeasonStatus({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          status: mockSeasonStatus,
        }),
      );

      expect(state.seasonId).toBe('season-1');
      expect(state.seasonName).toBe('Season 1');
      expect(state.seasonTiers).toHaveLength(1);
      const entry = state.seasonUserStatuses[seasonUserKey('season-1')];
      expect(entry?.balanceTotal).toBe(1500);
      expect(entry?.balanceUpdatedAt).toEqual(new Date(1714857600000));
      expect(entry?.currentTier?.id).toBe('tier-bronze');
      expect(entry?.nextTier?.id).toBe('tier-silver');
      expect(entry?.nextTierPointsNeeded).toBe(1000);
      expect(entry?.error).toBeNull();
      expect(entry?.loading).toBe(false);
    });

    it('deletes user entry when status is null and seasonId is known', () => {
      const key = seasonUserKey('season-1');
      const stateWithData = {
        ...initialState,
        seasonId: 'season-1',
        seasonName: 'Existing Season',
        seasonUserStatuses: {
          [key]: {
            balanceTotal: 1000,
            balanceUpdatedAt: null,
            currentTier: null,
            nextTier: null,
            nextTierPointsNeeded: null,
            loading: false,
            error: null,
          },
        },
      };

      const state = rewardsReducer(
        stateWithData,
        setSeasonStatus({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          status: null,
        }),
      );

      expect(state.seasonName).toBe('Existing Season');
      expect(state.seasonUserStatuses[key]).toBeUndefined();
    });

    it('isolates user status between subscriptions', () => {
      const mockStatus = {
        season: {
          id: 'season-1',
          name: 'Season 1',
          startDate: Date.now(),
          endDate: Date.now(),
          tiers: [],
          activityTypes: [],
          waysToEarn: [],
        },
        balance: { total: 100, updatedAt: Date.now() },
        tier: {
          currentTier: null,
          nextTier: null,
          nextTierPointsNeeded: null,
        },
      } as unknown as SeasonStatusState;

      let state = rewardsReducer(
        initialState,
        setSeasonStatus({ subscriptionId: 'sub-a', status: mockStatus }),
      );
      state = rewardsReducer(
        state,
        setSeasonStatus({
          subscriptionId: 'sub-b',
          status: {
            ...mockStatus,
            balance: { total: 999, updatedAt: Date.now() },
          } as unknown as SeasonStatusState,
        }),
      );

      expect(
        state.seasonUserStatuses[seasonUserKey('season-1', 'sub-a')]
          ?.balanceTotal,
      ).toBe(100);
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1', 'sub-b')]
          ?.balanceTotal,
      ).toBe(999);
    });
  });

  describe('setReferralDetails', () => {
    it('writes referral details under subscriptionId', () => {
      const state = rewardsReducer(
        initialState,
        setReferralDetails({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          referralCode: 'NEW123',
          refereeCount: 5,
          referredByCode: 'REF',
          isVipReferee: true,
          referredByVipCode: 'VIP',
        }),
      );

      const entry = state.referralDetails[TEST_SUBSCRIPTION_ID];
      expect(entry?.referralCode).toBe('NEW123');
      expect(entry?.refereeCount).toBe(5);
      expect(entry?.referredByCode).toBe('REF');
      expect(entry?.isVipReferee).toBe(true);
      expect(entry?.referredByVipCode).toBe('VIP');
      expect(entry?.loading).toBe(false);
    });

    it('does not cross-read between subscriptions', () => {
      let state = rewardsReducer(
        initialState,
        setReferralDetails({
          subscriptionId: 'sub-a',
          referralCode: 'AAA',
        }),
      );
      state = rewardsReducer(
        state,
        setReferralDetails({
          subscriptionId: 'sub-b',
          referralCode: 'BBB',
        }),
      );

      expect(state.referralDetails['sub-a']?.referralCode).toBe('AAA');
      expect(state.referralDetails['sub-b']?.referralCode).toBe('BBB');
    });
  });

  describe('setReferralDetailsError', () => {
    it('sets error for the subscription entry', () => {
      const state = rewardsReducer(
        initialState,
        setReferralDetailsError({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          error: true,
        }),
      );
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.error).toBe(true);
    });
  });

  describe('setSeasonStatusLoading', () => {
    it('sets loading when seasonId is available and no balance yet', () => {
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setSeasonStatusLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );
      expect(state.seasonUserStatuses[seasonUserKey('season-1')]?.loading).toBe(
        true,
      );
    });

    it('skips loading true when entry already has balance data', () => {
      const key = seasonUserKey('season-1');
      const stateWithData = {
        ...initialState,
        seasonId: 'season-1',
        seasonUserStatuses: {
          [key]: {
            balanceTotal: 100,
            balanceUpdatedAt: null,
            currentTier: null,
            nextTier: null,
            nextTierPointsNeeded: null,
            loading: false,
            error: null,
          },
        },
      };
      const state = rewardsReducer(
        stateWithData,
        setSeasonStatusLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );
      expect(state.seasonUserStatuses[key]?.loading).toBe(false);
    });
  });

  describe('setSeasonStatusError', () => {
    it('sets error on the keyed user entry', () => {
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setSeasonStatusError({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          error: 'boom',
        }),
      );
      expect(state.seasonUserStatuses[seasonUserKey('season-1')]?.error).toBe(
        'boom',
      );
    });
  });

  describe('setReferralDetailsLoading', () => {
    it('sets loading for the subscription entry', () => {
      const state = rewardsReducer(
        initialState,
        setReferralDetailsLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.loading).toBe(true);
    });

    it('skips loading true when referralCode already exists', () => {
      const stateWithCode = {
        ...initialState,
        referralDetails: {
          [TEST_SUBSCRIPTION_ID]: {
            referralCode: 'EXISTING',
            refereeCount: 0,
            referredByCode: null,
            isVipReferee: false,
            referredByVipCode: null,
            loading: false,
            error: false,
          },
        },
      };
      const state = rewardsReducer(
        stateWithCode,
        setReferralDetailsLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.loading).toBe(false);
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
        referralDetails: preservedReferralDetails('KEEP123'),
        seasonUserStatuses: preservedSeasonUserStatuses(1500),
      };
      const action = resetOnboarding();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.onboardingActiveStep).toBe(OnboardingStep.INTRO);
      expect(state.onboardingReferralCode).toBeNull();
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'KEEP123',
      );
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
      ).toBe(1500);
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
        referralDetails: preservedReferralDetails('KEEP123'),
        seasonUserStatuses: preservedSeasonUserStatuses(1500),
      };
      const action = setOnboardingReferralCode('REF789');

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.onboardingReferralCode).toBe('REF789');
      expect(state.onboardingActiveStep).toBe(OnboardingStep.STEP_2);
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'KEEP123',
      );
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
      ).toBe(1500);
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
        seasonId: 'season-keep',
        seasonName: 'Keep Season',
        campaigns: [{ id: 'keep-camp' }] as unknown as CampaignDto[],
        referralDetails: {
          keep: {
            referralCode: 'KEEP123',
            refereeCount: 0,
            referredByCode: null,
            isVipReferee: false,
            referredByVipCode: null,
            loading: false,
            error: false,
          },
        },
      };
      const action = setCandidateSubscriptionId('new-id');

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.candidateSubscriptionId).toBe('new-id');
      expect(state.seasonName).toBe('Keep Season');
      expect(state.campaigns).toHaveLength(1);
      expect(state.referralDetails.keep?.referralCode).toBe('KEEP123');
    });

    describe('no wipe when candidate ID changes', () => {
      it('preserves campaigns and season catalog when changing between valid IDs', () => {
        const campaigns = [
          {
            id: 'camp-1',
            type: CampaignType.ONDO_HOLDING,
            name: 'Campaign',
          },
        ] as unknown as CampaignDto[];
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
          seasonUserStatuses: {
            [seasonUserKey('season-123', 'old-subscription-id')]: {
              balanceTotal: 1500,
              balanceUpdatedAt: new Date('2024-06-01'),
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
              nextTier: null,
              nextTierPointsNeeded: null,
              loading: false,
              error: null,
            },
          },
          referralDetails: {
            'old-subscription-id': {
              referralCode: 'REF123',
              refereeCount: 5,
              referredByCode: null,
              isVipReferee: false,
              referredByVipCode: null,
              loading: false,
              error: false,
            },
          },
          campaigns,
          campaignsHasLoaded: true,
          onboardingActiveStep: OnboardingStep.STEP_2,
          onboardingReferralCode: 'ONBOARDING_REF',
        };
        const action = setCandidateSubscriptionId('new-subscription-id');

        const state = rewardsReducer(stateWithData, action);

        expect(state.candidateSubscriptionId).toBe('new-subscription-id');
        expect(state.seasonId).toBe('season-123');
        expect(state.seasonName).toBe('Test Season');
        expect(state.campaigns).toEqual(campaigns);
        expect(state.campaignsHasLoaded).toBe(true);
        expect(
          state.seasonUserStatuses[
            seasonUserKey('season-123', 'old-subscription-id')
          ]?.balanceTotal,
        ).toBe(1500);
        expect(state.referralDetails['old-subscription-id']?.referralCode).toBe(
          'REF123',
        );
        expect(state.onboardingActiveStep).toBe(OnboardingStep.STEP_2);
        expect(state.onboardingReferralCode).toBe('ONBOARDING_REF');
      });

      it('preserves keyed maps when changing from valid ID to pending', () => {
        const stateWithData = {
          ...initialState,
          candidateSubscriptionId: 'valid-subscription-id',
          seasonId: 'season-valid',
          seasonName: 'Valid Season',
          campaigns: [{ id: 'c1' }] as unknown as CampaignDto[],
          referralDetails: {
            'valid-subscription-id': {
              referralCode: 'VALID123',
              refereeCount: 1,
              referredByCode: null,
              isVipReferee: false,
              referredByVipCode: null,
              loading: false,
              error: false,
            },
          },
        };
        const state = rewardsReducer(
          stateWithData,
          setCandidateSubscriptionId('pending'),
        );

        expect(state.candidateSubscriptionId).toBe('pending');
        expect(state.seasonId).toBe('season-valid');
        expect(state.seasonName).toBe('Valid Season');
        expect(state.campaigns).toHaveLength(1);
        expect(
          state.referralDetails['valid-subscription-id']?.referralCode,
        ).toBe('VALID123');
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
          referralDetails: preservedReferralDetails('KEEP123'),
          seasonUserStatuses: preservedSeasonUserStatuses(1500),
        };
        const action = setHideUnlinkedAccountsBanner(true);

        // Act
        const state = rewardsReducer(stateWithData, action);

        // Assert
        expect(state.hideUnlinkedAccountsBanner).toBe(true);
        expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
          'KEEP123',
        );
        expect(
          state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
        ).toBe(1500);
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
          referralDetails: preservedReferralDetails('TEST123'),
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
        expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
          'TEST123',
        );
        expect(state.hideUnlinkedAccountsBanner).toBe(true);
      });
    });

    describe('resetRewardsState', () => {
      it('should reset all state to initial values', () => {
        const stateWithData: RewardsState = {
          ...initialState,
          activeTab: 'activity',
          seasonId: 'test-season-id',
          seasonName: 'Test Season',
          seasonUserStatuses: {
            [seasonUserKey('test-season-id')]: {
              balanceTotal: 1000,
              balanceUpdatedAt: null,
              currentTier: null,
              nextTier: null,
              nextTierPointsNeeded: null,
              loading: false,
              error: null,
            },
          },
          referralDetails: {
            [TEST_SUBSCRIPTION_ID]: {
              referralCode: 'TEST123',
              refereeCount: 10,
              referredByCode: null,
              isVipReferee: false,
              referredByVipCode: null,
              loading: false,
              error: false,
            },
          },
          campaigns: [
            {
              id: 'camp-1',
              type: CampaignType.ONDO_HOLDING,
              name: 'Camp',
            },
          ] as unknown as CampaignDto[],
          vipSplashAccepted: { 'sub-1': true },
        };

        const state = rewardsReducer(stateWithData, resetRewardsState());

        expect(state).toEqual(initialState);
      });
    });

    describe('persist/REHYDRATE', () => {
      it('restores season catalog and keyed maps without legacy flat fields', () => {
        const persistedRewardsState = {
          ...initialState,
          seasonId: 'test-season-id',
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
          seasonUserStatuses: {
            [seasonUserKey('test-season-id')]: {
              balanceTotal: 2000,
              balanceUpdatedAt: new Date('2024-05-01'),
              currentTier: null,
              nextTier: null,
              nextTierPointsNeeded: null,
              loading: false,
              error: null,
            },
          },
          referralDetails: {
            [TEST_SUBSCRIPTION_ID]: {
              referralCode: 'PERSISTED123',
              refereeCount: 15,
              referredByCode: null,
              isVipReferee: false,
              referredByVipCode: null,
              loading: false,
              error: false,
            },
          },
          campaigns: [
            {
              id: 'camp-1',
              type: CampaignType.ONDO_HOLDING,
              name: 'Camp',
            },
          ] as unknown as CampaignDto[],
          hideUnlinkedAccountsBanner: true,
        } as RewardsState;

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persistedRewardsState },
        });

        expect(state.seasonId).toBe('test-season-id');
        expect(state.seasonName).toBe('Persisted Season');
        expect(
          state.seasonUserStatuses[seasonUserKey('test-season-id')]
            ?.balanceTotal,
        ).toBe(2000);
        expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
          'PERSISTED123',
        );
        expect(state.campaigns).toHaveLength(1);
        expect(state.hideUnlinkedAccountsBanner).toBe(true);
        // Non-persistent loading flags stay initial
        expect(state.campaignsLoading).toBe(false);
      });

      it('defaults keyed maps to empty when absent from persisted state', () => {
        const persisted = {
          ...initialState,
          seasonId: 'season-x',
          seasonName: 'X',
        };
        delete (persisted as Partial<RewardsState>).seasonUserStatuses;
        delete (persisted as Partial<RewardsState>).referralDetails;

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted },
        });

        expect(state.seasonUserStatuses).toEqual({});
        expect(state.referralDetails).toEqual({});
        expect(state.seasonId).toBe('season-x');
      });

      it('replaces legacy array-shaped boosts, points, unlocked rewards, and benefits with empty maps', () => {
        const persisted = {
          ...initialState,
          activeBoosts: [{ id: 'boost-1' }],
          pointsEvents: [{ id: 'event-1' }],
          unlockedRewards: [{ id: 'reward-1' }],
          benefits: [{ id: 'benefit-1' }],
        };

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted as unknown as RewardsState },
        });

        expect(state.activeBoosts).toEqual({});
        expect(state.pointsEvents).toEqual({});
        expect(state.unlockedRewards).toEqual({});
        expect(state.benefits).toEqual({});
      });

      it('drops vip dashboard entries that are raw DTOs instead of cache entries', () => {
        const persisted = {
          ...initialState,
          vipDashboard: {
            [TEST_SUBSCRIPTION_ID]: { lastFetched: 1 },
          },
          vipRefereeDashboard: {
            [TEST_SUBSCRIPTION_ID]: { lastFetched: 2 },
          },
        };

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted as unknown as RewardsState },
        });

        expect(state.vipDashboard).toEqual({});
        expect(state.vipRefereeDashboard).toEqual({});
      });

      it('keeps vip dashboard cache entries and drops campaign-id-only money account stats keys', () => {
        const compositeKey = `${TEST_SUBSCRIPTION_ID}:campaign-1`;
        const cacheEntry = { data: null, loading: false, error: false };
        const persisted = {
          ...initialState,
          vipDashboard: {
            [TEST_SUBSCRIPTION_ID]: cacheEntry,
          },
          moneyAccountSweepstakesStats: {
            'campaign-1': cacheEntry,
            [compositeKey]: cacheEntry,
          },
        };

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted as unknown as RewardsState },
        });

        expect(state.vipDashboard[TEST_SUBSCRIPTION_ID]).toEqual(cacheEntry);
        expect(state.moneyAccountSweepstakesStats).toEqual({
          [compositeKey]: cacheEntry,
        });
      });
    });

    describe('unknown actions', () => {
      it('should return unchanged state for unknown actions', () => {
        // Arrange
        const stateWithData = {
          ...initialState,
          referralDetails: preservedReferralDetails('SOME_CODE'),
          seasonUserStatuses: preservedSeasonUserStatuses(1000),
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
    it('stores boosts under season:subscription key', () => {
      const mockBoosts = [
        {
          id: 'boost-1',
          name: 'Test Boost',
          icon: { lightModeUrl: 'a.png', darkModeUrl: 'b.png' },
          boostBips: 1000,
          seasonLong: true,
          backgroundColor: '#FF0000',
        },
      ];
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setActiveBoosts({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          boosts: mockBoosts,
        }),
      );
      expect(state.activeBoosts[seasonUserKey('season-1')]?.boosts).toEqual(
        mockBoosts,
      );
      expect(state.activeBoosts[seasonUserKey('season-1')]?.error).toBe(false);
    });
  });

  describe('setActiveBoostsLoading', () => {
    it('sets loading on keyed entry', () => {
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setActiveBoostsLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );
      expect(state.activeBoosts[seasonUserKey('season-1')]?.loading).toBe(true);
    });
  });

  describe('setActiveBoostsError', () => {
    it('sets error on keyed entry', () => {
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setActiveBoostsError({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          error: true,
        }),
      );
      expect(state.activeBoosts[seasonUserKey('season-1')]?.error).toBe(true);
    });
  });

  describe('setUnlockedRewards', () => {
    it('stores unlocked rewards under composite key', () => {
      const mockUnlockedRewards = [
        {
          id: 'reward-1',
          seasonRewardId: 'season-reward-1',
          claimStatus: RewardClaimStatus.CLAIMED,
        },
      ];
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setUnlockedRewards({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          rewards: mockUnlockedRewards,
        }),
      );
      expect(state.unlockedRewards[seasonUserKey('season-1')]?.rewards).toEqual(
        mockUnlockedRewards,
      );
    });
  });

  describe('setUnlockedRewardLoading', () => {
    it('sets loading on keyed entry', () => {
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setUnlockedRewardLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );
      expect(state.unlockedRewards[seasonUserKey('season-1')]?.loading).toBe(
        true,
      );
    });
  });

  describe('setUnlockedRewardError', () => {
    it('sets error on keyed entry', () => {
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setUnlockedRewardError({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          error: true,
        }),
      );
      expect(state.unlockedRewards[seasonUserKey('season-1')]?.error).toBe(
        true,
      );
    });
  });

  describe('setPointsEvents', () => {
    it('stores points events under composite key', () => {
      const mockPointsEvents = [
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
      ];
      const stateWithSeason = { ...initialState, seasonId: 'season-1' };
      const state = rewardsReducer(
        stateWithSeason,
        setPointsEvents({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          pointsEvents: mockPointsEvents,
        }),
      );
      expect(state.pointsEvents[seasonUserKey('season-1')]).toEqual(
        mockPointsEvents,
      );
    });
  });

  describe('bulkLinkStarted', () => {
    it('should set bulk link state to running with total accounts and subscription id', () => {
      // Arrange
      const action = bulkLinkStarted({
        totalAccounts: 10,
        subscriptionId: 'sub-123',
      });

      // Act
      const state = rewardsReducer(initialState, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(true);
      expect(state.bulkLink.totalAccounts).toBe(10);
      expect(state.bulkLink.linkedAccounts).toBe(0);
      expect(state.bulkLink.failedAccounts).toBe(0);
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.bulkLink.initialSubscriptionId).toBe('sub-123');
    });

    it('should reset linked and failed accounts when starting', () => {
      // Arrange
      const stateWithProgress = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 5,
          linkedAccounts: 3,
          failedAccounts: 1,
          wasInterrupted: true,
          initialSubscriptionId: 'old-sub',
        },
      };
      const action = bulkLinkStarted({
        totalAccounts: 8,
        subscriptionId: 'new-sub-456',
      });

      // Act
      const state = rewardsReducer(stateWithProgress, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(true);
      expect(state.bulkLink.totalAccounts).toBe(8);
      expect(state.bulkLink.linkedAccounts).toBe(0);
      expect(state.bulkLink.failedAccounts).toBe(0);
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.bulkLink.initialSubscriptionId).toBe('new-sub-456');
    });

    it('should clear wasInterrupted flag when starting fresh', () => {
      // Arrange
      const stateWithInterruption = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 5,
          linkedAccounts: 2,
          failedAccounts: 1,
          wasInterrupted: true,
          initialSubscriptionId: 'interrupted-sub',
        },
      };
      const action = bulkLinkStarted({
        totalAccounts: 10,
        subscriptionId: 'fresh-sub',
      });

      // Act
      const state = rewardsReducer(stateWithInterruption, action);

      // Assert
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.bulkLink.initialSubscriptionId).toBe('fresh-sub');
    });

    it('should not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        activeTab: 'activity' as const,
        referralDetails: preservedReferralDetails('TEST123'),
        seasonUserStatuses: preservedSeasonUserStatuses(1000),
      };
      const action = bulkLinkStarted({
        totalAccounts: 5,
        subscriptionId: 'test-sub',
      });

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(true);
      expect(state.bulkLink.totalAccounts).toBe(5);
      expect(state.bulkLink.initialSubscriptionId).toBe('test-sub');
      expect(state.activeTab).toBe('activity');
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'TEST123',
      );
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
      ).toBe(1000);
    });
  });

  describe('bulkLinkAccountResult', () => {
    it('should increment linkedAccounts when success is true', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 10,
          linkedAccounts: 3,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkAccountResult({ success: true });

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.linkedAccounts).toBe(4);
      expect(state.bulkLink.failedAccounts).toBe(1);
      expect(state.bulkLink.isRunning).toBe(true);
      expect(state.bulkLink.totalAccounts).toBe(10);
    });

    it('should increment failedAccounts when success is false', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 10,
          linkedAccounts: 3,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkAccountResult({ success: false });

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.failedAccounts).toBe(2);
      expect(state.bulkLink.linkedAccounts).toBe(3);
      expect(state.bulkLink.isRunning).toBe(true);
      expect(state.bulkLink.totalAccounts).toBe(10);
    });

    it('handles multiple account results', () => {
      // Arrange
      let currentState: RewardsState = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 5,
          linkedAccounts: 0,
          failedAccounts: 0,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };

      // Act & Assert - First account succeeds
      currentState = rewardsReducer(
        currentState,
        bulkLinkAccountResult({ success: true }),
      );
      expect(currentState.bulkLink.linkedAccounts).toBe(1);
      expect(currentState.bulkLink.failedAccounts).toBe(0);

      // Act & Assert - Second account succeeds
      currentState = rewardsReducer(
        currentState,
        bulkLinkAccountResult({ success: true }),
      );
      expect(currentState.bulkLink.linkedAccounts).toBe(2);
      expect(currentState.bulkLink.failedAccounts).toBe(0);

      // Act & Assert - Third account fails
      currentState = rewardsReducer(
        currentState,
        bulkLinkAccountResult({ success: false }),
      );
      expect(currentState.bulkLink.linkedAccounts).toBe(2);
      expect(currentState.bulkLink.failedAccounts).toBe(1);

      // Act & Assert - Fourth account succeeds
      currentState = rewardsReducer(
        currentState,
        bulkLinkAccountResult({ success: true }),
      );
      expect(currentState.bulkLink.linkedAccounts).toBe(3);
      expect(currentState.bulkLink.failedAccounts).toBe(1);
    });

    it('should not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        activeTab: 'activity' as const,
        referralDetails: preservedReferralDetails('TEST456'),
        bulkLink: {
          isRunning: true,
          totalAccounts: 5,
          linkedAccounts: 2,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkAccountResult({ success: true });

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.bulkLink.linkedAccounts).toBe(3);
      expect(state.activeTab).toBe('activity');
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'TEST456',
      );
    });
  });

  describe('bulkLinkCompleted', () => {
    it('sets isRunning to false', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 10,
          linkedAccounts: 8,
          failedAccounts: 2,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkCompleted();

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.totalAccounts).toBe(10);
      expect(state.bulkLink.linkedAccounts).toBe(8);
      expect(state.bulkLink.failedAccounts).toBe(2);
    });

    it('preserves progress when completing', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 5,
          linkedAccounts: 4,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkCompleted();

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.totalAccounts).toBe(5);
      expect(state.bulkLink.linkedAccounts).toBe(4);
      expect(state.bulkLink.failedAccounts).toBe(1);
    });

    it('does not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        activeTab: 'overview' as const,
        seasonUserStatuses: preservedSeasonUserStatuses(500),
        bulkLink: {
          isRunning: true,
          totalAccounts: 3,
          linkedAccounts: 2,
          failedAccounts: 0,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkCompleted();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.activeTab).toBe('overview');
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
      ).toBe(500);
    });
  });

  describe('bulkLinkCancelled', () => {
    it('sets isRunning to false', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 10,
          linkedAccounts: 5,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkCancelled();

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.totalAccounts).toBe(10);
      expect(state.bulkLink.linkedAccounts).toBe(5);
      expect(state.bulkLink.failedAccounts).toBe(1);
    });

    it('preserves progress when cancelling', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 8,
          linkedAccounts: 3,
          failedAccounts: 2,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkCancelled();

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.totalAccounts).toBe(8);
      expect(state.bulkLink.linkedAccounts).toBe(3);
      expect(state.bulkLink.failedAccounts).toBe(2);
    });

    it('does not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        referralDetails: preservedReferralDetails('CANCEL_TEST'),
        bulkLink: {
          isRunning: true,
          totalAccounts: 4,
          linkedAccounts: 1,
          failedAccounts: 0,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkCancelled();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'CANCEL_TEST',
      );
    });
  });

  describe('bulkLinkReset', () => {
    it('resets bulk link state to initial values', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 10,
          linkedAccounts: 7,
          failedAccounts: 2,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkReset();

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.totalAccounts).toBe(0);
      expect(state.bulkLink.linkedAccounts).toBe(0);
      expect(state.bulkLink.failedAccounts).toBe(0);
    });

    it('resets even when not running', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 5,
          linkedAccounts: 3,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = bulkLinkReset();

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.totalAccounts).toBe(0);
      expect(state.bulkLink.linkedAccounts).toBe(0);
      expect(state.bulkLink.failedAccounts).toBe(0);
    });

    it('does not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        activeTab: 'activity' as const,
        seasonUserStatuses: preservedSeasonUserStatuses(2000),
        bulkLink: {
          isRunning: true,
          totalAccounts: 6,
          linkedAccounts: 4,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: 'test-subscription-id',
        },
      };
      const action = bulkLinkReset();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.bulkLink).toEqual({
        isRunning: false,
        totalAccounts: 0,
        linkedAccounts: 0,
        failedAccounts: 0,
        wasInterrupted: false,
        initialSubscriptionId: null,
      });
      expect(state.activeTab).toBe('activity');
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
      ).toBe(2000);
    });
  });

  describe('BULK_LINK_CANCEL extraReducer', () => {
    it('sets isRunning to false when BULK_LINK_CANCEL action is dispatched', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 10,
          linkedAccounts: 5,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = { type: BULK_LINK_CANCEL };

      // Act
      const state = rewardsReducer(stateWithBulkLink, action as Action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.totalAccounts).toBe(10);
      expect(state.bulkLink.linkedAccounts).toBe(5);
      expect(state.bulkLink.failedAccounts).toBe(1);
    });

    it('preserves progress when cancelling via BULK_LINK_CANCEL', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 8,
          linkedAccounts: 3,
          failedAccounts: 2,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = { type: BULK_LINK_CANCEL };

      // Act
      const state = rewardsReducer(stateWithBulkLink, action as Action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.totalAccounts).toBe(8);
      expect(state.bulkLink.linkedAccounts).toBe(3);
      expect(state.bulkLink.failedAccounts).toBe(2);
    });

    it('does not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        referralDetails: preservedReferralDetails('CANCEL_EXTRA_TEST'),
        bulkLink: {
          isRunning: true,
          totalAccounts: 4,
          linkedAccounts: 2,
          failedAccounts: 0,
          wasInterrupted: false,
          initialSubscriptionId: null,
        },
      };
      const action = { type: BULK_LINK_CANCEL };

      // Act
      const state = rewardsReducer(stateWithData, action as Action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'CANCEL_EXTRA_TEST',
      );
    });
  });

  describe('bulkLinkSubscriptionChanged', () => {
    it('sets isRunning, wasInterrupted to false and clears initialSubscriptionId when subscription changes', () => {
      // Arrange
      const stateWithBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 10,
          linkedAccounts: 5,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: 'original-sub',
        },
      };
      const action = bulkLinkSubscriptionChanged();

      // Act
      const state = rewardsReducer(stateWithBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.bulkLink.initialSubscriptionId).toBeNull();
      // Preserves other fields
      expect(state.bulkLink.totalAccounts).toBe(10);
      expect(state.bulkLink.linkedAccounts).toBe(5);
      expect(state.bulkLink.failedAccounts).toBe(1);
    });

    it('clears wasInterrupted flag and initialSubscriptionId when subscription changes during interrupted state', () => {
      // Arrange
      const stateWithInterruptedBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 8,
          linkedAccounts: 3,
          failedAccounts: 2,
          wasInterrupted: true,
          initialSubscriptionId: 'interrupted-sub',
        },
      };
      const action = bulkLinkSubscriptionChanged();

      // Act
      const state = rewardsReducer(stateWithInterruptedBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.bulkLink.initialSubscriptionId).toBeNull();
    });

    it('preserves other state properties while clearing subscription data', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        referralDetails: preservedReferralDetails('SUB_CHANGED_TEST'),
        seasonUserStatuses: preservedSeasonUserStatuses(5000),
        bulkLink: {
          isRunning: true,
          totalAccounts: 6,
          linkedAccounts: 2,
          failedAccounts: 0,
          wasInterrupted: false,
          initialSubscriptionId: 'test-sub',
        },
      };
      const action = bulkLinkSubscriptionChanged();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.bulkLink.initialSubscriptionId).toBeNull();
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'SUB_CHANGED_TEST',
      );
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
      ).toBe(5000);
    });

    it('clears pendingMasSeriesOptIn when subscription changes', () => {
      const stateWithPending = {
        ...initialState,
        pendingMasSeriesOptIn: {
          needsRetry: true,
          subscriptionId: 'mas-sub',
        },
      };
      const action = bulkLinkSubscriptionChanged();

      const state = rewardsReducer(stateWithPending, action);

      expect(state.pendingMasSeriesOptIn).toEqual({
        needsRetry: false,
        subscriptionId: null,
      });
    });
  });

  describe('bulkLinkResumed', () => {
    it('should set isRunning to true and wasInterrupted to false when resuming', () => {
      // Arrange
      const stateWithInterruptedBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 10,
          linkedAccounts: 4,
          failedAccounts: 1,
          wasInterrupted: true,
          initialSubscriptionId: 'interrupted-sub',
        },
      };
      const action = bulkLinkResumed();

      // Act
      const state = rewardsReducer(stateWithInterruptedBulkLink, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(true);
      expect(state.bulkLink.wasInterrupted).toBe(false);
      // Preserves progress counts (saga will recalculate based on current opt-in status)
      expect(state.bulkLink.linkedAccounts).toBe(4);
      expect(state.bulkLink.failedAccounts).toBe(1);
      expect(state.bulkLink.totalAccounts).toBe(10);
      expect(state.bulkLink.initialSubscriptionId).toBe('interrupted-sub');
    });

    it('should preserve subscription ID for validation on resume', () => {
      // Arrange
      const stateWithInterruptedBulkLink = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 5,
          linkedAccounts: 2,
          failedAccounts: 0,
          wasInterrupted: true,
          initialSubscriptionId: 'sub-to-validate',
        },
      };
      const action = bulkLinkResumed();

      // Act
      const state = rewardsReducer(stateWithInterruptedBulkLink, action);

      // Assert
      expect(state.bulkLink.initialSubscriptionId).toBe('sub-to-validate');
    });

    it('should not reset counts when resuming', () => {
      // Arrange - state where some accounts were already linked before interruption
      const stateWithProgress = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 15,
          linkedAccounts: 8,
          failedAccounts: 2,
          wasInterrupted: true,
          initialSubscriptionId: 'progress-sub',
        },
      };
      const action = bulkLinkResumed();

      // Act
      const state = rewardsReducer(stateWithProgress, action);

      // Assert - counts should be preserved
      expect(state.bulkLink.linkedAccounts).toBe(8);
      expect(state.bulkLink.failedAccounts).toBe(2);
      expect(state.bulkLink.totalAccounts).toBe(15);
    });

    it('should not affect other state properties', () => {
      // Arrange
      const stateWithData = {
        ...initialState,
        referralDetails: preservedReferralDetails('RESUME_TEST'),
        seasonUserStatuses: preservedSeasonUserStatuses(3000),
        bulkLink: {
          isRunning: false,
          totalAccounts: 5,
          linkedAccounts: 2,
          failedAccounts: 1,
          wasInterrupted: true,
          initialSubscriptionId: 'resume-sub',
        },
      };
      const action = bulkLinkResumed();

      // Act
      const state = rewardsReducer(stateWithData, action);

      // Assert
      expect(state.bulkLink.isRunning).toBe(true);
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'RESUME_TEST',
      );
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
      ).toBe(3000);
    });
  });

  describe('persist/REHYDRATE with bulk link state', () => {
    it('should set wasInterrupted to true when rehydrating with isRunning true', () => {
      // Arrange - simulates app was closed while bulk link was in progress
      const persistedRewardsState: RewardsState = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 10,
          linkedAccounts: 5,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: 'running-sub',
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
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
      expect(state.bulkLink.wasInterrupted).toBe(true);
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.linkedAccounts).toBe(5);
      expect(state.bulkLink.failedAccounts).toBe(1);
      expect(state.bulkLink.initialSubscriptionId).toBe('running-sub');
    });

    it('should preserve progress counts when rehydrating interrupted bulk link', () => {
      // Arrange
      const persistedRewardsState: RewardsState = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 20,
          linkedAccounts: 12,
          failedAccounts: 3,
          wasInterrupted: false,
          initialSubscriptionId: 'progress-sub',
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      // Act
      const state = rewardsReducer(initialState, rehydrateAction);

      // Assert - progress should be preserved for UI display
      expect(state.bulkLink.linkedAccounts).toBe(12);
      expect(state.bulkLink.failedAccounts).toBe(3);
      expect(state.bulkLink.totalAccounts).toBe(0); // Note: totalAccounts is reset to 0 per current implementation
    });

    it('should preserve subscription ID for resume validation', () => {
      // Arrange
      const persistedRewardsState: RewardsState = {
        ...initialState,
        bulkLink: {
          isRunning: true,
          totalAccounts: 5,
          linkedAccounts: 2,
          failedAccounts: 0,
          wasInterrupted: false,
          initialSubscriptionId: 'validate-sub',
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
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
      expect(state.bulkLink.initialSubscriptionId).toBe('validate-sub');
    });

    it('should not set wasInterrupted when rehydrating with isRunning false', () => {
      // Arrange - bulk link was completed normally before app was closed
      const persistedRewardsState: RewardsState = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 10,
          linkedAccounts: 8,
          failedAccounts: 2,
          wasInterrupted: false,
          initialSubscriptionId: 'completed-sub',
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
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
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.bulkLink.isRunning).toBe(false);
    });

    it('should reset bulk link state to initial values when not interrupted', () => {
      // Arrange
      const persistedRewardsState: RewardsState = {
        ...initialState,
        bulkLink: {
          isRunning: false,
          totalAccounts: 5,
          linkedAccounts: 4,
          failedAccounts: 1,
          wasInterrupted: false,
          initialSubscriptionId: 'old-sub',
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      // Act
      const state = rewardsReducer(initialState, rehydrateAction);

      // Assert - should reset to initial values when not interrupted
      expect(state.bulkLink.linkedAccounts).toBe(0);
      expect(state.bulkLink.failedAccounts).toBe(0);
      expect(state.bulkLink.initialSubscriptionId).toBe(null);
    });

    it('should handle undefined bulk link state in persisted data', () => {
      // Arrange - older persisted data without bulk link state
      const persistedRewardsState = {
        ...initialState,
        referralCode: 'TEST123',
        bulkLink: undefined,
      } as unknown as RewardsState;
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      // Act
      const state = rewardsReducer(initialState, rehydrateAction);

      // Assert - should use initial bulk link state
      expect(state.bulkLink.isRunning).toBe(false);
      expect(state.bulkLink.wasInterrupted).toBe(false);
      expect(state.bulkLink.initialSubscriptionId).toBe(null);
    });
  });

  describe('setBenefits', () => {
    const mockBenefitsPayload = {
      limit: 10,
      lastFetched: 1767225600000,
      benefits: [
        {
          id: 101,
          longTitle: 'Premium Access',
          shortDescription: 'Get premium perks',
          longDescription: 'Unlock premium partner benefits.',
          thumbnail: 'https://example.com/benefits/premium.png',
          validFrom: '2026-01-01T00:00:00.000Z',
          validTo: '2026-12-31T00:00:00.000Z',
          actionDate: '2026-06-01T00:00:00.000Z',
          url: 'https://example.com/claim',
          chain: 'ethereum',
          type: { id: 1, name: 'Partner' },
        },
      ],
    };

    it('sets benefits under subscriptionId', () => {
      const state = rewardsReducer(
        initialState,
        setBenefits({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          benefits: mockBenefitsPayload,
        }),
      );
      expect(state.benefits[TEST_SUBSCRIPTION_ID]?.benefits).toEqual(
        mockBenefitsPayload.benefits,
      );
    });
  });

  describe('setBenefitsLoading', () => {
    it('sets loading under subscriptionId', () => {
      const state = rewardsReducer(
        initialState,
        setBenefitsLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );
      expect(state.benefits[TEST_SUBSCRIPTION_ID]?.loading).toBe(true);
    });
  });

  describe('setBenefitsError', () => {
    it('sets error under subscriptionId', () => {
      const state = rewardsReducer(
        initialState,
        setBenefitsError({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          error: true,
        }),
      );
      expect(state.benefits[TEST_SUBSCRIPTION_ID]?.error).toBe(true);
    });
  });

  describe('setVipDashboard', () => {
    const mockVipDashboard: VipDashboardState = {
      program: { id: 'mock-vip-program', name: 'Acme Rewards Beta' },
      period: {
        start: '2099-06-01T00:00:00.000Z',
        end: '2099-06-30T23:59:59.999Z',
      },
      computedAt: '2099-06-30T14:52:00.000Z',
      currentTier: {
        id: 'mock-tier-alpha-3',
        name: 'Mock Tier Alpha 3',
        tier: 3,
      },
      nextTier: { id: 'mock-tier-alpha-4', name: 'Mock Tier Alpha 4', tier: 4 },
      progress: {
        percent: 42,
        remainingPointsToNextTier: 123456,
        status: 'on_track',
      },
      fees: {
        revenueShareBps: 99,
        swapsBps: 11,
        perpsBps: 7,
        nextTierRevenueShareBps: 88,
        nextTierSwapsBps: 9,
        nextTierPerpsBps: 6,
      },
      volume: {
        swapsUsd: 1234567,
        perpsUsd: 9876543,
        points: 5555555,
        pointsFromReferrals: 111111,
        referrals: 3,
        referralsCap: 7,
      },
      pointsAllocation: {
        earned: 5555555,
        threshold: 7777777,
        percent: 71.4,
        lifetimeQualifyingPoints: null,
      },
      tiers: [
        {
          id: 'mock-tier-alpha-3',
          name: 'Mock Tier Alpha 3',
          tier: 3,
          pointsRequirement: 321000,
          revenueShareBps: 99,
          swapsBps: 11,
          perpsBps: 7,
          referralCarryoverBps: 4242,
          maintainPointsRequirement: null,
          status: 'current',
        },
      ],
      localizedText: {
        equityLifetimePointsDescription: 'Lifetime total: {points}',
        periodTitle: 'Jun 1 - Jun 30',
        memberIdTitle: 'Member ID',
        transactionsTitle: 'Transactions',
        swapsFeeTitle: 'Swaps fee',
        perpsFeeTitle: 'Perps fee',
        nextTierSwapsFeeDelta: '↓ 9 bps next tier',
        nextTierPerpsFeeDelta: '↓ 6 bps next tier',
        revenueShareTitle: 'Revenue share',
        referralPointsTitle: 'Referral points',
        nextTierRevenueShareDelta: '↑ 1% next tier',
        nextTierReferralPointsDelta: '↑ 42% next tier',
        topTierDescription: 'Top tier reached',
        statsTitle: 'Volume',
        pointsTitle: 'Points',
        swapsVolumeTitle: 'Swaps Volume',
        pointsFromReferralsTitle: 'Points from Referrals',
        perpsVolumeTitle: 'Perps Volume',
        vipReferralsTitle: 'VIP Referrals',
        totalPointsTitle: 'Points',
        equityLockedTitle: 'Earn VIP allocations',
        equityLockedDescription: 'Body copy',
        equityUnlockedTitle: 'VIP allocation unlocked',
        equityUnlockedDescription: 'Unlocked body copy',
        equityMultiplierFailedTitle: 'Estimate failed',
        equityMultiplierFailedDescription: 'Estimate failed body copy',
      },
      lastFetched: 1767225600000,
    };

    it('sets VIP dashboard by subscription id and clears error', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        vipDashboard: {
          'sub-1': { data: null, loading: false, error: true },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setVipDashboard({
        subscriptionId: 'sub-1',
        dashboard: mockVipDashboard,
      });

      const state = rewardsReducer(stateWithError, action);

      expect(state.vipDashboard['sub-1']?.data).toEqual(mockVipDashboard);
      expect(state.vipDashboard['sub-1']?.error).toBe(false);
    });

    it('sets VIP dashboard data to null when payload dashboard is null', () => {
      const stateWithDashboard: RewardsState = {
        ...initialState,
        vipDashboard: {
          'sub-1': {
            data: mockVipDashboard,
            loading: false,
            error: false,
          },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setVipDashboard({
        subscriptionId: 'sub-1',
        dashboard: null,
      });

      const state = rewardsReducer(stateWithDashboard, action);

      expect(state.vipDashboard['sub-1']?.data).toBeNull();
      expect(state.vipDashboard['sub-1']?.error).toBe(false);
    });
  });

  describe('setVipDashboardLoading', () => {
    it('sets loading by subscriptionId', () => {
      const state = rewardsReducer(
        initialState,
        setVipDashboardLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );
      expect(state.vipDashboard[TEST_SUBSCRIPTION_ID]?.loading).toBe(true);
    });
  });

  describe('setVipDashboardError', () => {
    it('sets error by subscriptionId', () => {
      const state = rewardsReducer(
        initialState,
        setVipDashboardError({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          error: true,
        }),
      );
      expect(state.vipDashboard[TEST_SUBSCRIPTION_ID]?.error).toBe(true);
    });
  });

  describe('acceptVipInvite', () => {
    it('marks the VIP invite as accepted for a subscription', () => {
      const state = rewardsReducer(
        initialState,
        acceptVipInvite({ subscriptionId: 'sub-1' }),
      );

      expect(state.vipSplashAccepted['sub-1']).toBe(true);
    });

    it('preserves existing accepted VIP invites for other subscriptions', () => {
      const stateWithAcceptedInvite: RewardsState = {
        ...initialState,
        vipSplashAccepted: {
          'sub-1': true,
        },
      };

      const state = rewardsReducer(
        stateWithAcceptedInvite,
        acceptVipInvite({ subscriptionId: 'sub-2' }),
      );

      expect(state.vipSplashAccepted).toEqual({
        'sub-1': true,
        'sub-2': true,
      });
    });
  });

  describe('VIP referee actions', () => {
    // Obviously-synthetic fixture — never real VIP codes/figures.
    const mockRefereeDashboard = {
      referredByCode: 'TESTCODE',
      points: 1234,
      swapsVolume: 1000,
      perpsVolume: 2000,
      computedAt: '2099-06-30T14:52:00.000Z',
      lastFetched: 1767225600000,
    };

    it('setReferralDetails stores isVipReferee and referredByVipCode', () => {
      const state = rewardsReducer(
        initialState,
        setReferralDetails({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          referralCode: 'MYCODE',
          refereeCount: 0,
          referredByCode: 'TESTCODE',
          isVipReferee: true,
          referredByVipCode: 'TESTCODE',
        }),
      );

      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.isVipReferee).toBe(
        true,
      );
      expect(
        state.referralDetails[TEST_SUBSCRIPTION_ID]?.referredByVipCode,
      ).toBe('TESTCODE');
    });

    it('setVipRefereeDashboard sets the dashboard by subscription id and clears error', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        vipRefereeDashboard: {
          'sub-1': { data: null, loading: false, error: true },
        },
      };
      const state = rewardsReducer(
        stateWithError,
        setVipRefereeDashboard({
          subscriptionId: 'sub-1',
          dashboard: mockRefereeDashboard,
        }),
      );

      expect(state.vipRefereeDashboard['sub-1']?.data).toEqual(
        mockRefereeDashboard,
      );
      expect(state.vipRefereeDashboard['sub-1']?.error).toBe(false);
    });

    it('setVipRefereeDashboard sets data to null when payload is null', () => {
      const stateWithDashboard: RewardsState = {
        ...initialState,
        vipRefereeDashboard: {
          'sub-1': {
            data: mockRefereeDashboard,
            loading: false,
            error: false,
          },
        },
      };
      const state = rewardsReducer(
        stateWithDashboard,
        setVipRefereeDashboard({ subscriptionId: 'sub-1', dashboard: null }),
      );

      expect(state.vipRefereeDashboard['sub-1']?.data).toBeNull();
      expect(state.vipRefereeDashboard['sub-1']?.error).toBe(false);
    });

    it('setVipRefereeDashboardLoading sets the loading flag', () => {
      const state = rewardsReducer(
        initialState,
        setVipRefereeDashboardLoading({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          loading: true,
        }),
      );

      expect(state.vipRefereeDashboard[TEST_SUBSCRIPTION_ID]?.loading).toBe(
        true,
      );
    });

    it('setVipRefereeDashboardError sets the error flag', () => {
      const state = rewardsReducer(
        initialState,
        setVipRefereeDashboardError({
          subscriptionId: TEST_SUBSCRIPTION_ID,
          error: true,
        }),
      );

      expect(state.vipRefereeDashboard[TEST_SUBSCRIPTION_ID]?.error).toBe(true);
    });

    it('acceptVipRefereeInvite marks the referee splash accepted, distinct from vipSplashAccepted', () => {
      const state = rewardsReducer(
        initialState,
        acceptVipRefereeInvite({ subscriptionId: 'sub-1' }),
      );

      expect(state.vipRefereeSplashAccepted['sub-1']).toBe(true);
      // Must NOT touch the regular VIP splash flag.
      expect(state.vipSplashAccepted['sub-1']).toBeUndefined();
    });
  });

  const mockCampaign: CampaignDto = {
    id: 'campaign-1',
    type: 'ONDO_HOLDING' as CampaignType,
    name: 'ONDO Holding Campaign',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2027-01-01T00:00:00.000Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: false,
    showUpcomingDate: false,
  };

  describe('setCampaigns', () => {
    it('should set campaigns array', () => {
      const action = setCampaigns([mockCampaign]);

      const state = rewardsReducer(initialState, action);

      expect(state.campaigns).toEqual([mockCampaign]);
      expect(state.campaignsError).toBe(false);
    });

    it('should replace existing campaigns with new ones', () => {
      const stateWithCampaigns: RewardsState = {
        ...initialState,
        campaigns: [mockCampaign],
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const newCampaign: CampaignDto = {
        ...mockCampaign,
        id: 'campaign-2',
        name: 'New Campaign',
      };
      const action = setCampaigns([newCampaign]);

      const state = rewardsReducer(stateWithCampaigns, action);

      expect(state.campaigns).toHaveLength(1);
      expect(state.campaigns[0].id).toBe('campaign-2');
    });

    it('should set campaigns to empty array', () => {
      const stateWithCampaigns: RewardsState = {
        ...initialState,
        campaigns: [mockCampaign],
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setCampaigns([]);

      const state = rewardsReducer(stateWithCampaigns, action);

      expect(state.campaigns).toEqual([]);
      expect(state.campaignsError).toBe(false);
    });

    it('should reset campaignsError when setting campaigns', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        campaignsError: true,
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setCampaigns([mockCampaign]);

      const state = rewardsReducer(stateWithError, action);

      expect(state.campaigns).toEqual([mockCampaign]);
      expect(state.campaignsError).toBe(false);
    });
  });

  describe('setCampaignsLoading', () => {
    it('should set campaignsLoading to true when no campaigns exist', () => {
      const action = setCampaignsLoading(true);

      const state = rewardsReducer(initialState, action);

      expect(state.campaignsLoading).toBe(true);
    });

    it('should not set loading to true when campaigns already exist', () => {
      const stateWithCampaigns: RewardsState = {
        ...initialState,
        campaigns: [mockCampaign],
        campaignsLoading: false,
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setCampaignsLoading(true);

      const state = rewardsReducer(stateWithCampaigns, action);

      expect(state.campaignsLoading).toBe(false);
    });

    it('should set campaignsLoading to false when loading is true', () => {
      const stateWithLoading: RewardsState = {
        ...initialState,
        campaignsLoading: true,
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setCampaignsLoading(false);

      const state = rewardsReducer(stateWithLoading, action);

      expect(state.campaignsLoading).toBe(false);
    });

    it('should set campaignsLoading to false even when campaigns exist', () => {
      const stateWithCampaigns: RewardsState = {
        ...initialState,
        campaigns: [mockCampaign],
        campaignsLoading: true,
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setCampaignsLoading(false);

      const state = rewardsReducer(stateWithCampaigns, action);

      expect(state.campaignsLoading).toBe(false);
    });
  });

  describe('setCampaignsError', () => {
    it('should set campaignsError to true and mark hasLoaded as true', () => {
      const action = setCampaignsError(true);

      const state = rewardsReducer(initialState, action);

      expect(state.campaignsError).toBe(true);
      expect(state.campaignsHasLoaded).toBe(true);
    });

    it('should set campaignsError to false without changing hasLoaded', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        campaignsError: true,
        campaignsHasLoaded: true,
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setCampaignsError(false);

      const state = rewardsReducer(stateWithError, action);

      expect(state.campaignsError).toBe(false);
      expect(state.campaignsHasLoaded).toBe(true);
    });

    it('should not change hasLoaded when clearing error and hasLoaded was false', () => {
      const stateWithErrorNoLoad: RewardsState = {
        ...initialState,
        campaignsError: true,
        campaignsHasLoaded: false,
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setCampaignsError(false);

      const state = rewardsReducer(stateWithErrorNoLoad, action);

      expect(state.campaignsError).toBe(false);
      expect(state.campaignsHasLoaded).toBe(false);
    });

    it('should toggle error state correctly while maintaining hasLoaded', () => {
      let currentState = initialState;

      let action = setCampaignsError(true);
      currentState = rewardsReducer(currentState, action);
      expect(currentState.campaignsError).toBe(true);
      expect(currentState.campaignsHasLoaded).toBe(true);

      action = setCampaignsError(false);
      currentState = rewardsReducer(currentState, action);
      expect(currentState.campaignsError).toBe(false);
      expect(currentState.campaignsHasLoaded).toBe(true);

      action = setCampaignsError(true);
      currentState = rewardsReducer(currentState, action);
      expect(currentState.campaignsError).toBe(true);
      expect(currentState.campaignsHasLoaded).toBe(true);
    });
  });

  describe('setCampaignParticipantStatus', () => {
    it('should set participant status keyed by subscriptionId:campaignId', () => {
      const action = setCampaignParticipantStatus({
        subscriptionId: 'sub-1',
        campaignId: 'campaign-1',
        status: { optedIn: true, participantCount: 42 },
      });

      const state = rewardsReducer(initialState, action);

      expect(state.campaignParticipantStatuses['sub-1:campaign-1']).toEqual({
        optedIn: true,
        participantCount: 42,
      });
    });

    it('should update existing participant status for the same subscriptionId:campaignId', () => {
      const stateWithStatus: RewardsState = {
        ...initialState,
        campaignParticipantStatuses: {
          'sub-1:campaign-1': { optedIn: false, participantCount: 10 },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };

      const action = setCampaignParticipantStatus({
        subscriptionId: 'sub-1',
        campaignId: 'campaign-1',
        status: { optedIn: true, participantCount: 50 },
      });

      const state = rewardsReducer(stateWithStatus, action);

      expect(state.campaignParticipantStatuses['sub-1:campaign-1']).toEqual({
        optedIn: true,
        participantCount: 50,
      });
    });

    it('should store statuses independently per subscriptionId:campaignId', () => {
      let currentState = initialState;

      currentState = rewardsReducer(
        currentState,
        setCampaignParticipantStatus({
          subscriptionId: 'sub-1',
          campaignId: 'campaign-1',
          status: { optedIn: true, participantCount: 42 },
        }),
      );

      currentState = rewardsReducer(
        currentState,
        setCampaignParticipantStatus({
          subscriptionId: 'sub-2',
          campaignId: 'campaign-1',
          status: { optedIn: false, participantCount: 0 },
        }),
      );

      expect(
        currentState.campaignParticipantStatuses['sub-1:campaign-1'],
      ).toEqual({
        optedIn: true,
        participantCount: 42,
      });
      expect(
        currentState.campaignParticipantStatuses['sub-2:campaign-1'],
      ).toEqual({
        optedIn: false,
        participantCount: 0,
      });
    });
  });

  describe('setVersionGuardMinimumMobileVersion', () => {
    it('should set minimum mobile version', () => {
      const action = setVersionGuardMinimumMobileVersion('7.30.0');

      const state = rewardsReducer(initialState, action);

      expect(state.versionGuardMinimumMobileVersion).toBe('7.30.0');
    });

    it('should update existing minimum mobile version', () => {
      const stateWithVersion: RewardsState = {
        ...initialState,
        versionGuardMinimumMobileVersion: '7.29.0',
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setVersionGuardMinimumMobileVersion('7.30.0');

      const state = rewardsReducer(stateWithVersion, action);

      expect(state.versionGuardMinimumMobileVersion).toBe('7.30.0');
    });

    it('should set minimum mobile version to null', () => {
      const stateWithVersion: RewardsState = {
        ...initialState,
        versionGuardMinimumMobileVersion: '7.30.0',
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setVersionGuardMinimumMobileVersion(null);

      const state = rewardsReducer(stateWithVersion, action);

      expect(state.versionGuardMinimumMobileVersion).toBeNull();
    });

    it('should not affect other state properties', () => {
      const action = setVersionGuardMinimumMobileVersion('7.30.0');

      const state = rewardsReducer(initialState, action);

      expect(state.versionGuardLoading).toBe(initialState.versionGuardLoading);
      expect(state.versionGuardError).toBe(initialState.versionGuardError);
      expect(state.activeTab).toBe(initialState.activeTab);
    });
  });

  describe('setVersionGuardLoading', () => {
    it('should set versionGuardLoading to true', () => {
      const action = setVersionGuardLoading(true);

      const state = rewardsReducer(initialState, action);

      expect(state.versionGuardLoading).toBe(true);
    });

    it('should set versionGuardLoading to false', () => {
      const stateWithLoading: RewardsState = {
        ...initialState,
        versionGuardLoading: true,
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setVersionGuardLoading(false);

      const state = rewardsReducer(stateWithLoading, action);

      expect(state.versionGuardLoading).toBe(false);
    });

    it('should not affect other state properties', () => {
      const action = setVersionGuardLoading(true);

      const state = rewardsReducer(initialState, action);

      expect(state.versionGuardMinimumMobileVersion).toBe(
        initialState.versionGuardMinimumMobileVersion,
      );
      expect(state.versionGuardError).toBe(initialState.versionGuardError);
    });
  });

  describe('setVersionGuardError', () => {
    it('should set versionGuardError to true', () => {
      const action = setVersionGuardError(true);

      const state = rewardsReducer(initialState, action);

      expect(state.versionGuardError).toBe(true);
    });

    it('should set versionGuardError to false', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        versionGuardError: true,
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setVersionGuardError(false);

      const state = rewardsReducer(stateWithError, action);

      expect(state.versionGuardError).toBe(false);
    });

    it('should toggle error state correctly', () => {
      let currentState = initialState;

      let action = setVersionGuardError(true);
      currentState = rewardsReducer(currentState, action);
      expect(currentState.versionGuardError).toBe(true);

      action = setVersionGuardError(false);
      currentState = rewardsReducer(currentState, action);
      expect(currentState.versionGuardError).toBe(false);

      action = setVersionGuardError(true);
      currentState = rewardsReducer(currentState, action);
      expect(currentState.versionGuardError).toBe(true);
    });

    it('should not affect other state properties', () => {
      const action = setVersionGuardError(true);

      const state = rewardsReducer(initialState, action);

      expect(state.versionGuardMinimumMobileVersion).toBe(
        initialState.versionGuardMinimumMobileVersion,
      );
      expect(state.versionGuardLoading).toBe(initialState.versionGuardLoading);
    });
  });

  const mockLeaderboard: CampaignLeaderboardDto = {
    campaignId: 'campaign-1',
    computedAt: '2024-03-20T12:00:00.000Z',
    tiers: {
      STARTER: {
        entries: [
          {
            rank: 1,
            referralCode: 'TOP001',
            rateOfReturn: 0.325,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 2,
            referralCode: 'TOP002',
            rateOfReturn: 0.284,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 3,
            referralCode: 'TOP003',
            rateOfReturn: 0.261,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 4,
            referralCode: 'TOP004',
            rateOfReturn: 0.238,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 5,
            referralCode: 'TOP005',
            rateOfReturn: 0.217,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 6,
            referralCode: 'TOP006',
            rateOfReturn: 0.198,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 7,
            referralCode: 'TOP007',
            rateOfReturn: 0.182,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 8,
            referralCode: 'TOP008',
            rateOfReturn: 0.167,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 9,
            referralCode: 'TOP009',
            rateOfReturn: 0.154,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 10,
            referralCode: 'TOP010',
            rateOfReturn: 0.141,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 11,
            referralCode: 'TOP011',
            rateOfReturn: 0.129,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 12,
            referralCode: 'TOP012',
            rateOfReturn: 0.118,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 13,
            referralCode: 'TOP013',
            rateOfReturn: 0.108,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 14,
            referralCode: 'TOP014',
            rateOfReturn: 0.099,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 15,
            referralCode: 'TOP015',
            rateOfReturn: 0.091,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 16,
            referralCode: 'TOP016',
            rateOfReturn: 0.083,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 17,
            referralCode: 'TOP017',
            rateOfReturn: 0.076,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 18,
            referralCode: 'TOP018',
            rateOfReturn: 0.069,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 19,
            referralCode: 'MY_CODE',
            rateOfReturn: 0.063,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 20,
            referralCode: 'TOP020',
            rateOfReturn: 0.057,
            qualifiedDays: 10,
            qualified: true,
          },
        ],
        totalParticipants: 150,
      },
      MID: {
        entries: [
          {
            rank: 1,
            referralCode: 'MID001',
            rateOfReturn: 0.412,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 2,
            referralCode: 'MID002',
            rateOfReturn: 0.368,
            qualifiedDays: 10,
            qualified: true,
          },
          {
            rank: 3,
            referralCode: 'MID003',
            rateOfReturn: 0.341,
            qualifiedDays: 10,
            qualified: true,
          },
        ],
        totalParticipants: 75,
      },
    },
  };

  const mockPosition: CampaignLeaderboardPositionDto = {
    projectedTier: 'STARTER',
    rank: 19,
    totalInTier: 150,
    rateOfReturn: 0.063,
    currentUsdValue: 5063,
    totalUsdDeposited: 5000,
    netDeposit: 4800,
    qualifiedDays: 10,
    qualified: true,
    neighbors: [],
    computedAt: '2024-03-20T12:00:00.000Z',
  };

  const mockPortfolio: OndoGmPortfolioDto = {
    positions: [],
    summary: {
      totalCurrentValue: '5063',
      totalBookValue: '5000',
      totalUsdDeposited: '5000',
      netDeposit: '4800',
      totalCashedOut: '0',
      portfolioPnl: '63',
      portfolioPnlPercent: '0.0126',
    },
    computedAt: '2024-03-20T12:00:00.000Z',
  };

  const MOCK_CAMPAIGN_ID = 'campaign-1';
  const PERPS_CAMPAIGN_ID = 'perps-c-1';
  const PREDICT_CAMPAIGN_ID = 'predict-c-1';

  describe('setOndoCampaignLeaderboard', () => {
    it('should set leaderboard data', () => {
      const action = setOndoCampaignLeaderboard({
        campaignId: MOCK_CAMPAIGN_ID,
        leaderboard: mockLeaderboard,
      });

      const state = rewardsReducer(initialState, action);

      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].data).toEqual(
        mockLeaderboard,
      );
      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].error).toBe(
        false,
      );
    });

    it('should set first tier as selected when not already set', () => {
      const action = setOndoCampaignLeaderboard({
        campaignId: MOCK_CAMPAIGN_ID,
        leaderboard: mockLeaderboard,
      });

      const state = rewardsReducer(initialState, action);

      expect(
        state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].selectedTier,
      ).toBe('STARTER');
    });

    it('should not override existing selected tier', () => {
      const stateWithSelectedTier: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboards: {
          [MOCK_CAMPAIGN_ID]: {
            data: null,
            loading: false,
            error: false,
            selectedTier: 'MID',
          },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignLeaderboard({
        campaignId: MOCK_CAMPAIGN_ID,
        leaderboard: mockLeaderboard,
      });

      const state = rewardsReducer(stateWithSelectedTier, action);

      expect(
        state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].selectedTier,
      ).toBe('MID');
    });

    it('should reset selected tier to first when current selection does not exist in new data', () => {
      const stateWithStaleSelection: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboards: {
          [MOCK_CAMPAIGN_ID]: {
            data: null,
            loading: false,
            error: false,
            selectedTier: 'UPPER',
          },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignLeaderboard({
        campaignId: MOCK_CAMPAIGN_ID,
        leaderboard: mockLeaderboard,
      });

      const state = rewardsReducer(stateWithStaleSelection, action);

      expect(
        state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].selectedTier,
      ).toBe('STARTER');
    });

    it('should set leaderboard to null', () => {
      const stateWithLeaderboard: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboards: {
          [MOCK_CAMPAIGN_ID]: {
            data: mockLeaderboard,
            loading: false,
            error: false,
            selectedTier: 'STARTER',
          },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignLeaderboard({
        campaignId: MOCK_CAMPAIGN_ID,
        leaderboard: null,
      });

      const state = rewardsReducer(stateWithLeaderboard, action);

      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].data).toBeNull();
    });

    it('should reset error when setting leaderboard', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboards: {
          [MOCK_CAMPAIGN_ID]: {
            data: null,
            loading: false,
            error: true,
            selectedTier: null,
          },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignLeaderboard({
        campaignId: MOCK_CAMPAIGN_ID,
        leaderboard: mockLeaderboard,
      });

      const state = rewardsReducer(stateWithError, action);

      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].error).toBe(
        false,
      );
    });

    it('should keep campaign A data when setting campaign B data', () => {
      const campaignA = 'campaign-a';
      const campaignB = 'campaign-b';
      const leaderboardA = { ...mockLeaderboard, campaignId: campaignA };
      const leaderboardB = { ...mockLeaderboard, campaignId: campaignB };

      let state = rewardsReducer(
        initialState,
        setOndoCampaignLeaderboard({
          campaignId: campaignA,
          leaderboard: leaderboardA,
        }),
      );
      state = rewardsReducer(
        state,
        setOndoCampaignLeaderboard({
          campaignId: campaignB,
          leaderboard: leaderboardB,
        }),
      );

      expect(state.ondoCampaignLeaderboards[campaignA].data).toEqual(
        leaderboardA,
      );
      expect(state.ondoCampaignLeaderboards[campaignB].data).toEqual(
        leaderboardB,
      );
    });
  });

  describe('setOndoCampaignLeaderboardLoading', () => {
    it('should set loading to true', () => {
      const action = setOndoCampaignLeaderboardLoading({
        campaignId: MOCK_CAMPAIGN_ID,
        loading: true,
      });

      const state = rewardsReducer(initialState, action);

      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].loading).toBe(
        true,
      );
    });

    it('should set loading to false', () => {
      const stateWithLoading: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboards: {
          [MOCK_CAMPAIGN_ID]: {
            data: null,
            loading: true,
            error: false,
            selectedTier: null,
          },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignLeaderboardLoading({
        campaignId: MOCK_CAMPAIGN_ID,
        loading: false,
      });

      const state = rewardsReducer(stateWithLoading, action);

      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].loading).toBe(
        false,
      );
    });
  });

  describe('setOndoCampaignLeaderboardError', () => {
    it('should set error to true and clear data', () => {
      const stateWithData: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboards: {
          [MOCK_CAMPAIGN_ID]: {
            data: mockLeaderboard,
            loading: false,
            error: false,
            selectedTier: 'STARTER',
          },
        },
      };
      const action = setOndoCampaignLeaderboardError({
        campaignId: MOCK_CAMPAIGN_ID,
        error: true,
      });

      const state = rewardsReducer(stateWithData, action);

      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].error).toBe(true);
      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].data).toBeNull();
    });

    it('should set error to false', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboards: {
          [MOCK_CAMPAIGN_ID]: {
            data: null,
            loading: false,
            error: true,
            selectedTier: null,
          },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignLeaderboardError({
        campaignId: MOCK_CAMPAIGN_ID,
        error: false,
      });

      const state = rewardsReducer(stateWithError, action);

      expect(state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].error).toBe(
        false,
      );
    });
  });

  describe('setOndoCampaignLeaderboardSelectedTier', () => {
    it('should set selected tier', () => {
      const action = setOndoCampaignLeaderboardSelectedTier({
        campaignId: MOCK_CAMPAIGN_ID,
        tier: 'MID',
      });

      const state = rewardsReducer(initialState, action);

      expect(
        state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].selectedTier,
      ).toBe('MID');
    });

    it('should update selected tier', () => {
      const stateWithSelectedTier: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboards: {
          [MOCK_CAMPAIGN_ID]: {
            data: null,
            loading: false,
            error: false,
            selectedTier: 'STARTER',
          },
        },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignLeaderboardSelectedTier({
        campaignId: MOCK_CAMPAIGN_ID,
        tier: 'UPPER',
      });

      const state = rewardsReducer(stateWithSelectedTier, action);

      expect(
        state.ondoCampaignLeaderboards[MOCK_CAMPAIGN_ID].selectedTier,
      ).toBe('UPPER');
    });
  });

  describe('setOndoCampaignLeaderboardPosition', () => {
    it('should set position for a campaign', () => {
      const action = setOndoCampaignLeaderboardPosition({
        subscriptionId: 'sub-1',
        campaignId: 'campaign-1',
        position: mockPosition,
      });

      const state = rewardsReducer(initialState, action);

      expect(
        state.ondoCampaignLeaderboardPositions['sub-1:campaign-1'],
      ).toEqual(mockPosition);
    });

    it('should remove position when null is provided', () => {
      const stateWithPosition: RewardsState = {
        ...initialState,
        ondoCampaignLeaderboardPositions: { 'sub-1:campaign-1': mockPosition },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignLeaderboardPosition({
        subscriptionId: 'sub-1',
        campaignId: 'campaign-1',
        position: null,
      });

      const state = rewardsReducer(stateWithPosition, action);

      expect(
        state.ondoCampaignLeaderboardPositions['sub-1:campaign-1'],
      ).toBeUndefined();
    });

    it('should store positions for multiple campaigns', () => {
      let currentState = initialState;

      currentState = rewardsReducer(
        currentState,
        setOndoCampaignLeaderboardPosition({
          subscriptionId: 'sub-1',
          campaignId: 'campaign-1',
          position: mockPosition,
        }),
      );

      const position2 = { ...mockPosition, rank: 10, projectedTier: 'MID' };
      currentState = rewardsReducer(
        currentState,
        setOndoCampaignLeaderboardPosition({
          subscriptionId: 'sub-1',
          campaignId: 'campaign-2',
          position: position2,
        }),
      );

      expect(
        currentState.ondoCampaignLeaderboardPositions['sub-1:campaign-1'],
      ).toEqual(mockPosition);
      expect(
        currentState.ondoCampaignLeaderboardPositions['sub-1:campaign-2'],
      ).toEqual(position2);
    });
  });

  describe('setOndoCampaignPortfolioPosition', () => {
    it('should set portfolio for a campaign', () => {
      const action = setOndoCampaignPortfolioPosition({
        subscriptionId: 'sub-1',
        campaignId: 'campaign-1',
        portfolio: mockPortfolio,
      });

      const state = rewardsReducer(initialState, action);

      expect(state.ondoCampaignPortfolio['sub-1:campaign-1']).toEqual(
        mockPortfolio,
      );
    });

    it('should remove portfolio when null is provided', () => {
      const stateWithPortfolio: RewardsState = {
        ...initialState,
        ondoCampaignPortfolio: { 'sub-1:campaign-1': mockPortfolio },
        dismissedCampaignOutcomeToasts: {},
        subscribedCampaignReminders: {},
      };
      const action = setOndoCampaignPortfolioPosition({
        subscriptionId: 'sub-1',
        campaignId: 'campaign-1',
        portfolio: null,
      });

      const state = rewardsReducer(stateWithPortfolio, action);

      expect(state.ondoCampaignPortfolio['sub-1:campaign-1']).toBeUndefined();
    });
  });

  describe('setOndoCampaignActivity', () => {
    it('should set activity entries for a campaign', () => {
      const mockEntries: OndoGmActivityEntryDto[] = [
        {
          type: 'DEPOSIT',
          srcToken: {
            tokenAsset: 'eip155:59144/erc20:0xabc',
            tokenSymbol: 'USDC',
            tokenName: 'USD Coin',
          },
          destToken: null,
          destAddress: null,
          usdAmount: '5000.000000',
          timestamp: '2026-03-28T14:30:00.000Z',
        },
      ];
      const action = setOndoCampaignActivity({
        subscriptionId: 'sub-1',
        campaignId: 'campaign-1',
        entries: mockEntries,
      });

      const state = rewardsReducer(initialState, action);

      expect(state.ondoCampaignActivity['sub-1:campaign-1']).toEqual(
        mockEntries,
      );
    });

    it('should set null when null entries provided', () => {
      const action = setOndoCampaignActivity({
        subscriptionId: 'sub-1',
        campaignId: 'campaign-1',
        entries: null,
      });

      const state = rewardsReducer(initialState, action);

      expect(state.ondoCampaignActivity['sub-1:campaign-1']).toBeNull();
    });
  });

  describe('setVipTransactions', () => {
    const mockTransactions: VipTransactionDto[] = [
      {
        id: 'transaction-1',
        type: 'SWAP',
        timestamp: '2026-07-22T12:00:00.000Z',
        feeUsd: '1.25',
        volumeUsd: '250.00',
        swap: {
          quoteId: 'quote-1',
          srcChainId: '1',
          destChainId: '59144',
        },
      },
    ];

    it('sets transactions by subscription and transaction type', () => {
      const action = setVipTransactions({
        subscriptionId: 'sub-1',
        type: 'SWAP',
        transactions: mockTransactions,
      });

      const state = rewardsReducer(initialState, action);

      expect(state.vipTransactions['sub-1:SWAP']).toEqual(mockTransactions);
    });

    it('stores null for a loaded transaction type with no result', () => {
      const action = setVipTransactions({
        subscriptionId: 'sub-1',
        type: 'PERPS',
        transactions: null,
      });

      const state = rewardsReducer(initialState, action);

      expect(state.vipTransactions['sub-1:PERPS']).toBeNull();
    });

    it('clears transactions when rewards state resets', () => {
      const stateWithTransactions: RewardsState = {
        ...initialState,
        vipTransactions: { 'sub-1:SWAP': mockTransactions },
      };

      const state = rewardsReducer(stateWithTransactions, resetRewardsState());

      expect(state.vipTransactions).toEqual({});
    });
  });

  const mockPerpsLeaderboard: PerpsTradingCampaignLeaderboardDto = {
    campaignId: 'perps-c-1',
    computedAt: '2025-08-15T12:00:00.000Z',
    entries: [],
    totalParticipants: 42,
    minVolumeForEligibility: 25_000,
  };

  const mockPerpsPosition: PerpsTradingCampaignLeaderboardPositionDto = {
    rank: 2,
    totalParticipants: 42,
    pnl: 100,
    volume: 5000,
    eligible: true,
    minVolumeForEligibility: 25000,
    neighbors: [],
    computedAt: '2025-08-15T12:00:00.000Z',
  };

  describe('setPerpsTradingCampaignLeaderboard', () => {
    it('sets leaderboard data and clears error', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        perpsTradingCampaignLeaderboards: {
          [PERPS_CAMPAIGN_ID]: {
            data: null,
            loading: false,
            error: true,
          },
        },
      };

      const state = rewardsReducer(
        stateWithError,
        setPerpsTradingCampaignLeaderboard({
          campaignId: PERPS_CAMPAIGN_ID,
          leaderboard: mockPerpsLeaderboard,
        }),
      );

      expect(
        state.perpsTradingCampaignLeaderboards[PERPS_CAMPAIGN_ID].data,
      ).toEqual(mockPerpsLeaderboard);
      expect(
        state.perpsTradingCampaignLeaderboards[PERPS_CAMPAIGN_ID].error,
      ).toBe(false);
    });

    it('sets leaderboard to null', () => {
      const stateWithData: RewardsState = {
        ...initialState,
        perpsTradingCampaignLeaderboards: {
          [PERPS_CAMPAIGN_ID]: {
            data: mockPerpsLeaderboard,
            loading: false,
            error: false,
          },
        },
      };

      const state = rewardsReducer(
        stateWithData,
        setPerpsTradingCampaignLeaderboard({
          campaignId: PERPS_CAMPAIGN_ID,
          leaderboard: null,
        }),
      );

      expect(
        state.perpsTradingCampaignLeaderboards[PERPS_CAMPAIGN_ID].data,
      ).toBeNull();
    });
  });

  describe('setPerpsTradingCampaignLeaderboardLoading', () => {
    it('sets loading to true', () => {
      const state = rewardsReducer(
        initialState,
        setPerpsTradingCampaignLeaderboardLoading({
          campaignId: PERPS_CAMPAIGN_ID,
          loading: true,
        }),
      );

      expect(
        state.perpsTradingCampaignLeaderboards[PERPS_CAMPAIGN_ID].loading,
      ).toBe(true);
    });

    it('clears loading to false', () => {
      const stateWithLoading: RewardsState = {
        ...initialState,
        perpsTradingCampaignLeaderboards: {
          [PERPS_CAMPAIGN_ID]: {
            data: null,
            loading: true,
            error: false,
          },
        },
      };

      const state = rewardsReducer(
        stateWithLoading,
        setPerpsTradingCampaignLeaderboardLoading({
          campaignId: PERPS_CAMPAIGN_ID,
          loading: false,
        }),
      );

      expect(
        state.perpsTradingCampaignLeaderboards[PERPS_CAMPAIGN_ID].loading,
      ).toBe(false);
    });
  });

  describe('setPerpsTradingCampaignLeaderboardError', () => {
    it('sets and clears the error flag and clears data on error', () => {
      const withData: RewardsState = {
        ...initialState,
        perpsTradingCampaignLeaderboards: {
          [PERPS_CAMPAIGN_ID]: {
            data: mockPerpsLeaderboard,
            loading: false,
            error: false,
          },
        },
      };
      const withError = rewardsReducer(
        withData,
        setPerpsTradingCampaignLeaderboardError({
          campaignId: PERPS_CAMPAIGN_ID,
          error: true,
        }),
      );
      expect(
        withError.perpsTradingCampaignLeaderboards[PERPS_CAMPAIGN_ID].error,
      ).toBe(true);
      expect(
        withError.perpsTradingCampaignLeaderboards[PERPS_CAMPAIGN_ID].data,
      ).toBeNull();

      const cleared = rewardsReducer(
        withError,
        setPerpsTradingCampaignLeaderboardError({
          campaignId: PERPS_CAMPAIGN_ID,
          error: false,
        }),
      );
      expect(
        cleared.perpsTradingCampaignLeaderboards[PERPS_CAMPAIGN_ID].error,
      ).toBe(false);
    });
  });

  describe('setPerpsTradingCampaignLeaderboardPosition', () => {
    it('stores a position for subscription + campaign and removes on null', () => {
      let state = rewardsReducer(
        initialState,
        setPerpsTradingCampaignLeaderboardPosition({
          subscriptionId: 'sub-p',
          campaignId: 'camp-p',
          position: mockPerpsPosition,
        }),
      );

      expect(
        state.perpsTradingCampaignLeaderboardPositions['sub-p:camp-p'],
      ).toEqual(mockPerpsPosition);

      state = rewardsReducer(
        state,
        setPerpsTradingCampaignLeaderboardPosition({
          subscriptionId: 'sub-p',
          campaignId: 'camp-p',
          position: null,
        }),
      );

      expect(
        state.perpsTradingCampaignLeaderboardPositions['sub-p:camp-p'],
      ).toBeUndefined();
    });
  });

  describe('perps trading campaign volume', () => {
    const mockVolume: PerpsTradingCampaignVolumeDto = {
      totalUsdVolume: '1000000',
    };

    it('setPerpsTradingCampaignVolume sets data and clears error', () => {
      const stateWithError: RewardsState = {
        ...initialState,
        perpsTradingCampaignVolumes: {
          [PERPS_CAMPAIGN_ID]: {
            data: null,
            loading: false,
            error: true,
          },
        },
      };

      const state = rewardsReducer(
        stateWithError,
        setPerpsTradingCampaignVolume({
          campaignId: PERPS_CAMPAIGN_ID,
          volume: mockVolume,
        }),
      );

      expect(state.perpsTradingCampaignVolumes[PERPS_CAMPAIGN_ID].data).toEqual(
        mockVolume,
      );
      expect(state.perpsTradingCampaignVolumes[PERPS_CAMPAIGN_ID].error).toBe(
        false,
      );
    });

    it('setPerpsTradingCampaignVolumeLoading toggles loading per campaign', () => {
      const stateWithVolume: RewardsState = {
        ...initialState,
        perpsTradingCampaignVolumes: {
          [PERPS_CAMPAIGN_ID]: {
            data: mockVolume,
            loading: false,
            error: false,
          },
        },
      };

      const loading = rewardsReducer(
        stateWithVolume,
        setPerpsTradingCampaignVolumeLoading({
          campaignId: PERPS_CAMPAIGN_ID,
          loading: true,
        }),
      );
      expect(
        loading.perpsTradingCampaignVolumes[PERPS_CAMPAIGN_ID].loading,
      ).toBe(true);
    });

    it('setPerpsTradingCampaignVolumeError toggles the flag and clears data', () => {
      const withData: RewardsState = {
        ...initialState,
        perpsTradingCampaignVolumes: {
          [PERPS_CAMPAIGN_ID]: {
            data: mockVolume,
            loading: false,
            error: false,
          },
        },
      };
      const on = rewardsReducer(
        withData,
        setPerpsTradingCampaignVolumeError({
          campaignId: PERPS_CAMPAIGN_ID,
          error: true,
        }),
      );
      expect(on.perpsTradingCampaignVolumes[PERPS_CAMPAIGN_ID].error).toBe(
        true,
      );
      expect(on.perpsTradingCampaignVolumes[PERPS_CAMPAIGN_ID].data).toBeNull();

      const off = rewardsReducer(
        on,
        setPerpsTradingCampaignVolumeError({
          campaignId: PERPS_CAMPAIGN_ID,
          error: false,
        }),
      );
      expect(off.perpsTradingCampaignVolumes[PERPS_CAMPAIGN_ID].error).toBe(
        false,
      );
    });
  });

  const mockPredictLeaderboard: PredictThePitchLeaderboardDto = {
    campaignId: 'predict-c-1',
    computedAt: '2026-06-30T12:00:00.000Z',
    entries: [],
    totalParticipants: 10,
  };

  const mockPredictPosition: PredictThePitchLeaderboardPositionDto = {
    rank: 1,
    totalParticipants: 10,
    roi: 0.25,
    pnl: 50,
    volume: 200,
    eligible: true,
    neighbors: [],
    computedAt: '2026-06-30T12:00:00.000Z',
    marketsTraded: 3,
    minimumMarketsTraded: 3,
  };

  const mockPredictPositions: PredictThePitchPositionsDto = {
    openPositions: [
      {
        outcomeAssetId: 'token-1',
        outcomeAsset: 'Yes',
        conditionId: '0xcondition',
        conditionName: 'Brazil vs Argentina',
        conditionSlug: 'brazil-vs-argentina',
        eventId: '0xnav',
        eventSlug: 'world-cup',
        iconUrl: null,
        capitalDeployed: 200,
        pnl: 50,
        roi: 0.25,
        status: 'open',
        fillShares: 100,
        fillSharesBought: 100,
        fillSharesSold: 0,
        fillPrice: 2,
        fillDate: '2026-06-30T12:00:00.000Z',
      },
    ],
    resolvedPositions: [],
    computedAt: '2026-06-30T12:00:00.000Z',
  };

  const mockPredictPrizePool: PredictThePitchPrizePoolDto = {
    totalVolumeUsd: 1000,
    unlockedPoolUsd: 500,
    thresholdsUsd: [0, 1000],
    poolScheduleUsd: [250, 500],
    breakdown: [{ rank: 1, amountUsd: 500 }],
    computedAt: null,
  };

  describe('predict the pitch reducers', () => {
    it('sets and removes leaderboard data', () => {
      let state = rewardsReducer(
        {
          ...initialState,
          predictThePitchLeaderboards: {
            [PREDICT_CAMPAIGN_ID]: {
              data: null,
              loading: false,
              error: true,
            },
          },
        },
        setPredictThePitchLeaderboard({
          campaignId: PREDICT_CAMPAIGN_ID,
          leaderboard: mockPredictLeaderboard,
        }),
      );

      expect(
        state.predictThePitchLeaderboards[PREDICT_CAMPAIGN_ID].data,
      ).toEqual(mockPredictLeaderboard);
      expect(state.predictThePitchLeaderboards[PREDICT_CAMPAIGN_ID].error).toBe(
        false,
      );

      state = rewardsReducer(
        state,
        setPredictThePitchLeaderboard({
          campaignId: PREDICT_CAMPAIGN_ID,
          leaderboard: null,
        }),
      );

      expect(
        state.predictThePitchLeaderboards[PREDICT_CAMPAIGN_ID].data,
      ).toBeNull();
    });

    it('toggles leaderboard loading and errors per campaign', () => {
      const withLoading = rewardsReducer(
        initialState,
        setPredictThePitchLeaderboardLoading({
          campaignId: PREDICT_CAMPAIGN_ID,
          loading: true,
        }),
      );
      expect(
        withLoading.predictThePitchLeaderboards[PREDICT_CAMPAIGN_ID].loading,
      ).toBe(true);

      const withError = rewardsReducer(
        {
          ...initialState,
          predictThePitchLeaderboards: {
            [PREDICT_CAMPAIGN_ID]: {
              data: mockPredictLeaderboard,
              loading: false,
              error: false,
            },
          },
        },
        setPredictThePitchLeaderboardError({
          campaignId: PREDICT_CAMPAIGN_ID,
          error: true,
        }),
      );
      expect(
        withError.predictThePitchLeaderboards[PREDICT_CAMPAIGN_ID].error,
      ).toBe(true);
      expect(
        withError.predictThePitchLeaderboards[PREDICT_CAMPAIGN_ID].data,
      ).toBeNull();
    });

    it('sets and removes leaderboard positions and positions by subscription/campaign key', () => {
      let state = rewardsReducer(
        initialState,
        setPredictThePitchLeaderboardPosition({
          subscriptionId: 'sub-1',
          campaignId: 'predict-c-1',
          position: mockPredictPosition,
        }),
      );
      state = rewardsReducer(
        state,
        setPredictThePitchPositions({
          subscriptionId: 'sub-1',
          campaignId: 'predict-c-1',
          positions: mockPredictPositions,
        }),
      );

      expect(
        state.predictThePitchLeaderboardPositions['sub-1:predict-c-1'],
      ).toEqual(mockPredictPosition);
      expect(state.predictThePitchPositions['sub-1:predict-c-1']).toEqual(
        mockPredictPositions,
      );

      state = rewardsReducer(
        state,
        setPredictThePitchLeaderboardPosition({
          subscriptionId: 'sub-1',
          campaignId: 'predict-c-1',
          position: null,
        }),
      );
      state = rewardsReducer(
        state,
        setPredictThePitchPositions({
          subscriptionId: 'sub-1',
          campaignId: 'predict-c-1',
          positions: null,
        }),
      );

      expect(
        state.predictThePitchLeaderboardPositions['sub-1:predict-c-1'],
      ).toBeUndefined();
      expect(
        state.predictThePitchPositions['sub-1:predict-c-1'],
      ).toBeUndefined();
    });

    it('sets and removes prize-pool data', () => {
      let state = rewardsReducer(
        {
          ...initialState,
          predictThePitchPrizePools: {
            [PREDICT_CAMPAIGN_ID]: {
              data: null,
              loading: false,
              error: true,
            },
          },
        },
        setPredictThePitchPrizePool({
          campaignId: PREDICT_CAMPAIGN_ID,
          prizePool: mockPredictPrizePool,
        }),
      );

      expect(state.predictThePitchPrizePools[PREDICT_CAMPAIGN_ID].data).toEqual(
        mockPredictPrizePool,
      );
      expect(state.predictThePitchPrizePools[PREDICT_CAMPAIGN_ID].error).toBe(
        false,
      );

      state = rewardsReducer(
        state,
        setPredictThePitchPrizePool({
          campaignId: PREDICT_CAMPAIGN_ID,
          prizePool: null,
        }),
      );

      expect(
        state.predictThePitchPrizePools[PREDICT_CAMPAIGN_ID].data,
      ).toBeNull();
    });

    it('toggles prize-pool loading and errors per campaign', () => {
      const withLoading = rewardsReducer(
        initialState,
        setPredictThePitchPrizePoolLoading({
          campaignId: PREDICT_CAMPAIGN_ID,
          loading: true,
        }),
      );
      expect(
        withLoading.predictThePitchPrizePools[PREDICT_CAMPAIGN_ID].loading,
      ).toBe(true);

      const withError = rewardsReducer(
        {
          ...initialState,
          predictThePitchPrizePools: {
            [PREDICT_CAMPAIGN_ID]: {
              data: mockPredictPrizePool,
              loading: false,
              error: false,
            },
          },
        },
        setPredictThePitchPrizePoolError({
          campaignId: PREDICT_CAMPAIGN_ID,
          error: true,
        }),
      );
      expect(
        withError.predictThePitchPrizePools[PREDICT_CAMPAIGN_ID].error,
      ).toBe(true);
      expect(
        withError.predictThePitchPrizePools[PREDICT_CAMPAIGN_ID].data,
      ).toBeNull();
    });
  });

  describe('perpsTradingCampaignPrizePools', () => {
    const PERPS_CAMPAIGN_ID = 'perps-c-1';
    const mockPerpsPrizePool: PerpsTradingCampaignPrizePoolDto = {
      totalVolumeUsd: 7_500_000,
      unlockedPoolUsd: 15_000,
      thresholdsUsd: [0, 5_000_000],
      poolScheduleUsd: [10_000, 15_000],
      computedAt: '2026-07-15T00:00:00.000Z',
    };

    it('sets and removes prize-pool data', () => {
      let state = rewardsReducer(
        {
          ...initialState,
          perpsTradingCampaignPrizePools: {
            [PERPS_CAMPAIGN_ID]: { data: null, loading: false, error: true },
          },
        },
        setPerpsTradingCampaignPrizePool({
          campaignId: PERPS_CAMPAIGN_ID,
          prizePool: mockPerpsPrizePool,
        }),
      );

      expect(
        state.perpsTradingCampaignPrizePools[PERPS_CAMPAIGN_ID].data,
      ).toEqual(mockPerpsPrizePool);
      expect(
        state.perpsTradingCampaignPrizePools[PERPS_CAMPAIGN_ID].error,
      ).toBe(false);

      state = rewardsReducer(
        state,
        setPerpsTradingCampaignPrizePool({
          campaignId: PERPS_CAMPAIGN_ID,
          prizePool: null,
        }),
      );

      expect(
        state.perpsTradingCampaignPrizePools[PERPS_CAMPAIGN_ID].data,
      ).toBeNull();
    });

    it('toggles prize-pool loading and errors per campaign', () => {
      const withLoading = rewardsReducer(
        initialState,
        setPerpsTradingCampaignPrizePoolLoading({
          campaignId: PERPS_CAMPAIGN_ID,
          loading: true,
        }),
      );
      expect(
        withLoading.perpsTradingCampaignPrizePools[PERPS_CAMPAIGN_ID].loading,
      ).toBe(true);

      const withError = rewardsReducer(
        {
          ...initialState,
          perpsTradingCampaignPrizePools: {
            [PERPS_CAMPAIGN_ID]: {
              data: mockPerpsPrizePool,
              loading: false,
              error: false,
            },
          },
        },
        setPerpsTradingCampaignPrizePoolError({
          campaignId: PERPS_CAMPAIGN_ID,
          error: true,
        }),
      );
      expect(
        withError.perpsTradingCampaignPrizePools[PERPS_CAMPAIGN_ID].error,
      ).toBe(true);
      expect(
        withError.perpsTradingCampaignPrizePools[PERPS_CAMPAIGN_ID].data,
      ).toBeNull();
    });
  });

  describe('ondoCampaignDeposits', () => {
    it('setOndoCampaignDeposits sets data and clears error', () => {
      const deposits = { totalUsdDeposited: '1250000.000000' };
      const prevState = {
        ...initialState,
        ondoCampaignDeposits: {
          [MOCK_CAMPAIGN_ID]: {
            data: null,
            loading: false,
            error: true,
          },
        },
      };

      const state = rewardsReducer(
        prevState,
        setOndoCampaignDeposits({ campaignId: MOCK_CAMPAIGN_ID, deposits }),
      );

      expect(state.ondoCampaignDeposits[MOCK_CAMPAIGN_ID].data).toEqual(
        deposits,
      );
      expect(state.ondoCampaignDeposits[MOCK_CAMPAIGN_ID].error).toBe(false);
    });

    it('setOndoCampaignDepositsLoading toggles loading per campaign', () => {
      const state = rewardsReducer(
        initialState,
        setOndoCampaignDepositsLoading({
          campaignId: MOCK_CAMPAIGN_ID,
          loading: true,
        }),
      );

      expect(state.ondoCampaignDeposits[MOCK_CAMPAIGN_ID].loading).toBe(true);
    });

    it('setOndoCampaignDepositsLoading(false) clears loading', () => {
      const prevState = {
        ...initialState,
        ondoCampaignDeposits: {
          [MOCK_CAMPAIGN_ID]: {
            data: null,
            loading: true,
            error: false,
          },
        },
      };

      const state = rewardsReducer(
        prevState,
        setOndoCampaignDepositsLoading({
          campaignId: MOCK_CAMPAIGN_ID,
          loading: false,
        }),
      );

      expect(state.ondoCampaignDeposits[MOCK_CAMPAIGN_ID].loading).toBe(false);
    });

    it('setOndoCampaignDepositsError clears data on error', () => {
      const prevState = {
        ...initialState,
        ondoCampaignDeposits: {
          [MOCK_CAMPAIGN_ID]: {
            data: { totalUsdDeposited: '500000' },
            loading: false,
            error: false,
          },
        },
      };

      const state = rewardsReducer(
        prevState as RewardsState,
        setOndoCampaignDepositsError({
          campaignId: MOCK_CAMPAIGN_ID,
          error: true,
        }),
      );

      expect(state.ondoCampaignDeposits[MOCK_CAMPAIGN_ID].error).toBe(true);
      expect(state.ondoCampaignDeposits[MOCK_CAMPAIGN_ID].data).toBeNull();
    });

    it('resetRewardsState resets deposits map', () => {
      const prevState = {
        ...initialState,
        ondoCampaignDeposits: {
          [MOCK_CAMPAIGN_ID]: {
            data: { totalUsdDeposited: '500000' },
            loading: true,
            error: true,
          },
        },
      };

      const state = rewardsReducer(
        prevState as RewardsState,
        resetRewardsState(),
      );

      expect(state.ondoCampaignDeposits).toEqual({});
    });

    describe('dismissCampaignOutcomeToast', () => {
      it('records winner variant as dismissed', () => {
        const state = rewardsReducer(
          initialState,
          dismissCampaignOutcomeToast({
            campaignId: 'perps-c-1',
            subscriptionId: 'sub-9',
            variant: 'winner',
          }),
        );

        expect(
          state.dismissedCampaignOutcomeToasts['perps-c-1:sub-9:winner'],
        ).toBe(true);
      });

      it('records non_winner variant as dismissed', () => {
        const state = rewardsReducer(
          initialState,
          dismissCampaignOutcomeToast({
            campaignId: 'ondo-c-1',
            subscriptionId: 'sub-8',
            variant: 'non_winner',
          }),
        );

        expect(
          state.dismissedCampaignOutcomeToasts['ondo-c-1:sub-8:non_winner'],
        ).toBe(true);
      });

      it('accumulates multiple dismissed toasts without overwriting existing ones', () => {
        let state = rewardsReducer(
          initialState,
          dismissCampaignOutcomeToast({
            campaignId: 'c1',
            subscriptionId: 's1',
            variant: 'winner',
          }),
        );
        state = rewardsReducer(
          state,
          dismissCampaignOutcomeToast({
            campaignId: 'c2',
            subscriptionId: 's2',
            variant: 'non_winner',
          }),
        );

        expect(state.dismissedCampaignOutcomeToasts['c1:s1:winner']).toBe(true);
        expect(state.dismissedCampaignOutcomeToasts['c2:s2:non_winner']).toBe(
          true,
        );
      });

      it('starts with empty dismissedCampaignOutcomeToasts in initial state', () => {
        expect(initialState.dismissedCampaignOutcomeToasts).toEqual({});
      });
    });

    describe('subscribeCampaignReminder', () => {
      it('records subscription keyed by subscriptionId and campaignId', () => {
        const state = rewardsReducer(
          initialState,
          subscribeCampaignReminder({
            subscriptionId: 'sub-1',
            campaignId: 'camp-2',
          }),
        );

        expect(state.subscribedCampaignReminders['sub-1:camp-2']).toBe(true);
      });

      it('accumulates multiple subscriptions without overwriting existing ones', () => {
        let state = rewardsReducer(
          initialState,
          subscribeCampaignReminder({
            subscriptionId: 'sub-1',
            campaignId: 'camp-1',
          }),
        );
        state = rewardsReducer(
          state,
          subscribeCampaignReminder({
            subscriptionId: 'sub-1',
            campaignId: 'camp-2',
          }),
        );

        expect(state.subscribedCampaignReminders['sub-1:camp-1']).toBe(true);
        expect(state.subscribedCampaignReminders['sub-1:camp-2']).toBe(true);
      });

      it('starts with empty subscribedCampaignReminders in initial state', () => {
        expect(initialState.subscribedCampaignReminders).toEqual({});
      });
    });

    describe('persist/REHYDRATE — dismissedCampaignOutcomeToasts', () => {
      it('restores dismissedCampaignOutcomeToasts from persisted state', () => {
        const persisted: RewardsState = {
          ...initialState,
          dismissedCampaignOutcomeToasts: {
            'campaign-1:sub-1:winner': true,
          },
        };

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted },
        });

        expect(state.dismissedCampaignOutcomeToasts).toEqual({
          'campaign-1:sub-1:winner': true,
        });
      });

      it('defaults to empty object when dismissedCampaignOutcomeToasts is absent from persisted state', () => {
        const persisted = { ...initialState } as Partial<RewardsState>;
        delete persisted.dismissedCampaignOutcomeToasts;

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted },
        });

        expect(state.dismissedCampaignOutcomeToasts).toEqual({});
      });
    });

    describe('persist/REHYDRATE — subscribedCampaignReminders', () => {
      it('restores subscribedCampaignReminders from persisted state', () => {
        const persisted: RewardsState = {
          ...initialState,
          subscribedCampaignReminders: {
            'sub-1:camp-1': true,
          },
        };

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted },
        });

        expect(state.subscribedCampaignReminders).toEqual({
          'sub-1:camp-1': true,
        });
      });

      it('defaults to empty object when subscribedCampaignReminders is absent from persisted state', () => {
        const persisted = { ...initialState } as Partial<RewardsState>;
        delete persisted.subscribedCampaignReminders;

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted },
        });

        expect(state.subscribedCampaignReminders).toEqual({});
      });
    });

    describe('persist/REHYDRATE — vipSplashAccepted', () => {
      it('restores accepted VIP invite state from persisted rewards state', () => {
        const persisted: RewardsState = {
          ...initialState,
          vipSplashAccepted: {
            'sub-1': true,
          },
        };

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted },
        });

        expect(state.vipSplashAccepted).toEqual({ 'sub-1': true });
      });

      it('defaults to empty object when vipSplashAccepted is absent from persisted state', () => {
        const persisted = { ...initialState } as Partial<RewardsState>;
        delete persisted.vipSplashAccepted;

        const state = rewardsReducer(initialState, {
          type: 'persist/REHYDRATE',
          payload: { rewards: persisted },
        });

        expect(state.vipSplashAccepted).toEqual({});
      });
    });

    describe('setCandidateSubscriptionId — preserves dismissedCampaignOutcomeToasts', () => {
      it('preserves dismissedCampaignOutcomeToasts when subscription ID changes', () => {
        const stateWithDismissals: RewardsState = {
          ...initialState,
          candidateSubscriptionId: 'old-sub',
          dismissedCampaignOutcomeToasts: {
            'campaign-1:old-sub:winner': true,
          },
        };

        const state = rewardsReducer(
          stateWithDismissals,
          setCandidateSubscriptionId('new-sub'),
        );

        expect(state.dismissedCampaignOutcomeToasts).toEqual({
          'campaign-1:old-sub:winner': true,
        });
      });
    });

    describe('setCandidateSubscriptionId — preserves subscribedCampaignReminders', () => {
      it('preserves subscribedCampaignReminders when subscription ID changes', () => {
        const stateWithReminders: RewardsState = {
          ...initialState,
          candidateSubscriptionId: 'old-sub',
          subscribedCampaignReminders: {
            'old-sub:camp-1': true,
          },
        };

        const state = rewardsReducer(
          stateWithReminders,
          setCandidateSubscriptionId('new-sub'),
        );

        expect(state.subscribedCampaignReminders).toEqual({
          'old-sub:camp-1': true,
        });
      });
    });

    describe('setCandidateSubscriptionId — preserves vipSplashAccepted', () => {
      it('preserves accepted VIP invites when subscription ID changes', () => {
        const stateWithAcceptedInvite: RewardsState = {
          ...initialState,
          candidateSubscriptionId: 'old-sub',
          vipSplashAccepted: {
            'old-sub': true,
          },
        };

        const state = rewardsReducer(
          stateWithAcceptedInvite,
          setCandidateSubscriptionId('new-sub'),
        );

        expect(state.vipSplashAccepted).toEqual({
          'old-sub': true,
        });
      });
    });

    describe('setCandidateSubscriptionId — preserves firstPredictionOnUsInteraction', () => {
      it('preserves the interaction trail when subscription ID changes', () => {
        const stateWithInteraction: RewardsState = {
          ...initialState,
          candidateSubscriptionId: 'old-sub',
          firstPredictionOnUsInteraction: {
            offerViewed: true,
            skipped: false,
            marketId: 'market-1',
            outcome: 'Yes',
            orderStatus: 'executed',
            predictAccountAddress: '0xabc',
            transactionHash: '0xhash',
          },
        };

        const state = rewardsReducer(
          stateWithInteraction,
          setCandidateSubscriptionId('new-sub'),
        );

        expect(state.firstPredictionOnUsInteraction).toEqual({
          offerViewed: true,
          skipped: false,
          marketId: 'market-1',
          outcome: 'Yes',
          orderStatus: 'executed',
          predictAccountAddress: '0xabc',
          transactionHash: '0xhash',
        });
      });
    });

    describe('First Prediction On Us interaction actions', () => {
      it('marks the offer as viewed', () => {
        const state = rewardsReducer(
          initialState,
          markFirstPredictionOnUsOfferViewed(),
        );

        expect(state.firstPredictionOnUsInteraction.offerViewed).toBe(true);
      });

      it('marks the offer as skipped', () => {
        const state = rewardsReducer(
          initialState,
          markFirstPredictionOnUsSkipped(),
        );

        expect(state.firstPredictionOnUsInteraction.skipped).toBe(true);
      });

      it('records outcome opened details and clears prior order evidence', () => {
        const seeded: RewardsState = {
          ...initialState,
          firstPredictionOnUsInteraction: {
            offerViewed: true,
            skipped: false,
            marketId: 'old-market',
            outcome: 'No',
            orderStatus: 'executed',
            predictAccountAddress: '0xold',
            transactionHash: '0xoldhash',
          },
        };

        const state = rewardsReducer(
          seeded,
          markFirstPredictionOnUsOutcomeOpened({
            marketId: 'market-1',
            outcome: 'Yes',
          }),
        );

        expect(state.firstPredictionOnUsInteraction).toEqual({
          offerViewed: true,
          skipped: false,
          marketId: 'market-1',
          outcome: 'Yes',
          orderStatus: null,
          predictAccountAddress: null,
          transactionHash: null,
        });
      });

      it('records confirmed order status', () => {
        const state = rewardsReducer(
          initialState,
          markFirstPredictionOnUsOrderConfirmed({
            marketId: 'market-1',
            outcome: 'Yes',
          }),
        );

        expect(state.firstPredictionOnUsInteraction).toMatchObject({
          skipped: false,
          marketId: 'market-1',
          outcome: 'Yes',
          orderStatus: 'confirmed',
        });
      });

      it('records executed order status with account and transaction evidence', () => {
        const state = rewardsReducer(
          initialState,
          markFirstPredictionOnUsOrderExecuted({
            marketId: 'market-1',
            outcome: 'Yes',
            predictAccountAddress: '0xabc',
            transactionHash: '0xhash',
          }),
        );

        expect(state.firstPredictionOnUsInteraction).toEqual({
          offerViewed: false,
          skipped: false,
          marketId: 'market-1',
          outcome: 'Yes',
          orderStatus: 'executed',
          predictAccountAddress: '0xabc',
          transactionHash: '0xhash',
        });
      });

      it('records failed order status and clears account evidence', () => {
        const seeded: RewardsState = {
          ...initialState,
          firstPredictionOnUsInteraction: {
            offerViewed: true,
            skipped: false,
            marketId: 'market-1',
            outcome: 'Yes',
            orderStatus: 'confirmed',
            predictAccountAddress: '0xabc',
            transactionHash: '0xhash',
          },
        };

        const state = rewardsReducer(
          seeded,
          markFirstPredictionOnUsOrderFailed({
            marketId: 'market-1',
            outcome: 'Yes',
          }),
        );

        expect(state.firstPredictionOnUsInteraction).toEqual({
          offerViewed: true,
          skipped: false,
          marketId: 'market-1',
          outcome: 'Yes',
          orderStatus: 'failed',
          predictAccountAddress: null,
          transactionHash: null,
        });
      });
    });
  });

  describe('setPendingMasSeriesOptIn', () => {
    it('starts with a cleared pendingMasSeriesOptIn in initial state', () => {
      expect(initialState.pendingMasSeriesOptIn).toEqual({
        needsRetry: false,
        subscriptionId: null,
      });
    });

    it('sets needsRetry and subscriptionId', () => {
      const action = setPendingMasSeriesOptIn({
        needsRetry: true,
        subscriptionId: 'sub-mas-1',
      });

      const state = rewardsReducer(initialState, action);

      expect(state.pendingMasSeriesOptIn).toEqual({
        needsRetry: true,
        subscriptionId: 'sub-mas-1',
      });
    });

    it('overwrites a previous pending flag', () => {
      const stateWithPending = {
        ...initialState,
        pendingMasSeriesOptIn: {
          needsRetry: true,
          subscriptionId: 'old-sub',
        },
      };
      const action = setPendingMasSeriesOptIn({
        needsRetry: true,
        subscriptionId: 'new-sub',
      });

      const state = rewardsReducer(stateWithPending, action);

      expect(state.pendingMasSeriesOptIn).toEqual({
        needsRetry: true,
        subscriptionId: 'new-sub',
      });
    });

    it('does not affect other state properties', () => {
      const stateWithData = {
        ...initialState,
        referralDetails: preservedReferralDetails('KEEP_ME'),
        seasonUserStatuses: preservedSeasonUserStatuses(42),
      };
      const action = setPendingMasSeriesOptIn({
        needsRetry: true,
        subscriptionId: 'sub-1',
      });

      const state = rewardsReducer(stateWithData, action);

      expect(state.pendingMasSeriesOptIn.needsRetry).toBe(true);
      expect(state.referralDetails[TEST_SUBSCRIPTION_ID]?.referralCode).toBe(
        'KEEP_ME',
      );
      expect(
        state.seasonUserStatuses[seasonUserKey('season-1')]?.balanceTotal,
      ).toBe(42);
    });
  });

  describe('clearPendingMasSeriesOptIn', () => {
    it('resets pendingMasSeriesOptIn to the initial empty flag', () => {
      const stateWithPending = {
        ...initialState,
        pendingMasSeriesOptIn: {
          needsRetry: true,
          subscriptionId: 'sub-mas-1',
        },
      };
      const action = clearPendingMasSeriesOptIn();

      const state = rewardsReducer(stateWithPending, action);

      expect(state.pendingMasSeriesOptIn).toEqual({
        needsRetry: false,
        subscriptionId: null,
      });
    });

    it('is a no-op when pending is already clear', () => {
      const action = clearPendingMasSeriesOptIn();

      const state = rewardsReducer(initialState, action);

      expect(state.pendingMasSeriesOptIn).toEqual({
        needsRetry: false,
        subscriptionId: null,
      });
    });
  });

  describe('persist/REHYDRATE — pendingMasSeriesOptIn', () => {
    it('restores pendingMasSeriesOptIn from persisted state', () => {
      const persistedRewardsState: RewardsState = {
        ...initialState,
        pendingMasSeriesOptIn: {
          needsRetry: true,
          subscriptionId: 'persisted-sub',
        },
      };
      const rehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {
          rewards: persistedRewardsState,
        },
      };

      const state = rewardsReducer(initialState, rehydrateAction);

      expect(state.pendingMasSeriesOptIn).toEqual({
        needsRetry: true,
        subscriptionId: 'persisted-sub',
      });
    });

    it('defaults to the initial pending flag when absent from persisted state', () => {
      const persisted = { ...initialState } as Partial<RewardsState>;
      delete persisted.pendingMasSeriesOptIn;

      const state = rewardsReducer(initialState, {
        type: 'persist/REHYDRATE',
        payload: { rewards: persisted },
      });

      expect(state.pendingMasSeriesOptIn).toEqual({
        needsRetry: false,
        subscriptionId: null,
      });
    });
  });
});
