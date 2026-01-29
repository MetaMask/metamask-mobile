import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusState,
  SeasonTierDto,
  GeoRewardsMetadata,
  PointsBoostDto,
  RewardDto,
  PointsEventDto,
  SeasonActivityTypeDto,
} from '../../core/Engine/controllers/rewards-controller/types';
import { OnboardingStep } from './types';
import { AccountGroupId } from '@metamask/account-api';

export interface AccountOptInBannerInfoStatus {
  accountGroupId: AccountGroupId;
  hide: boolean;
}

export interface RewardsState {
  activeTab: 'overview' | 'activity' | 'levels';
  seasonStatusLoading: boolean;
  seasonStatusError: string | null;

  // Season state
  seasonId: string | null;
  seasonName: string | null;
  seasonStartDate: Date | null;
  seasonEndDate: Date | null;
  seasonTiers: SeasonTierDto[];
  seasonActivityTypes: SeasonActivityTypeDto[];
  seasonShouldInstallNewVersion: string | null;

  // Subscription Referral state
  referralDetailsLoading: boolean;
  referralDetailsError: boolean;
  referralCode: string | null;
  refereeCount: number;

  // Season tier state
  currentTier: SeasonTierDto | null;
  nextTier: SeasonTierDto | null;
  nextTierPointsNeeded: number | null;

  // Season Balance state
  balanceTotal: number | null;
  balanceRefereePortion: number | null;
  balanceUpdatedAt: Date | null;

  // Onboarding state
  onboardingActiveStep: OnboardingStep;
  onboardingReferralCode: string | null;

  // Candidate subscription state
  candidateSubscriptionId: string | 'pending' | 'error' | 'retry' | null;

  // Geolocation state
  geoLocation: string | null;
  optinAllowedForGeo: boolean | null;
  optinAllowedForGeoLoading: boolean;
  optinAllowedForGeoError: boolean;

  // UI preferences
  hideCurrentAccountNotOptedInBanner: AccountOptInBannerInfoStatus[];
  hideUnlinkedAccountsBanner: boolean;

  // Points Boost state
  activeBoosts: PointsBoostDto[] | null;
  activeBoostsLoading: boolean;
  activeBoostsError: boolean;

  // Points Events state
  pointsEvents: PointsEventDto[] | null;

  // Unlocked Rewards state
  unlockedRewards: RewardDto[] | null;
  unlockedRewardLoading: boolean;
  unlockedRewardError: boolean;
}

export const initialState: RewardsState = {
  activeTab: 'overview',
  seasonStatusLoading: false,
  seasonStatusError: null,

  seasonId: null,
  seasonName: null,
  seasonStartDate: null,
  seasonEndDate: null,
  seasonTiers: [],
  seasonActivityTypes: [],

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

  // Should install new version state
  seasonShouldInstallNewVersion: null,

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

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    rewards?: RewardsState;
  };
}

const rewardsSlice = createSlice({
  name: 'rewards',
  initialState,
  reducers: {
    setActiveTab: (
      state,
      action: PayloadAction<'overview' | 'activity' | 'levels'>,
    ) => {
      state.activeTab = action.payload;
    },

    setSeasonStatus: (
      state,
      action: PayloadAction<SeasonStatusState | null>,
    ) => {
      // Clear error on successful data fetch
      state.seasonStatusError = null;

      // Season state
      state.seasonId = action.payload?.season.id || null;
      state.seasonName = action.payload?.season.name || null;
      state.seasonStartDate = action.payload?.season.startDate
        ? new Date(action.payload.season.startDate)
        : null;
      state.seasonEndDate = action.payload?.season.endDate
        ? new Date(action.payload.season.endDate)
        : null;
      state.seasonTiers = action.payload?.season.tiers || [];
      state.seasonActivityTypes = action.payload?.season.activityTypes || [];
      state.seasonShouldInstallNewVersion =
        action.payload?.season?.shouldInstallNewVersion || null;

      // Season Balance state
      state.balanceTotal =
        action.payload?.balance &&
        typeof action.payload.balance.total === 'number'
          ? action.payload.balance.total
          : null;
      state.balanceUpdatedAt = action.payload?.balance?.updatedAt
        ? new Date(action.payload.balance.updatedAt)
        : null;

      // Season tier state
      state.currentTier = action.payload?.tier?.currentTier || null;
      state.nextTier = action.payload?.tier?.nextTier || null;
      state.nextTierPointsNeeded =
        action.payload?.tier?.nextTierPointsNeeded || null;
    },

    setReferralDetails: (
      state,
      action: PayloadAction<{
        referralCode?: string;
        refereeCount?: number;
        referralPoints?: number;
      }>,
    ) => {
      if (action.payload.referralCode !== undefined) {
        state.referralCode = action.payload.referralCode;
      }
      if (action.payload.refereeCount !== undefined) {
        state.refereeCount = action.payload.refereeCount;
      }
      if (action.payload.referralPoints !== undefined) {
        state.balanceRefereePortion = action.payload.referralPoints;
      }
      state.referralDetailsLoading = false;
    },

    setReferralDetailsLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.referralCode) {
        return;
      }
      state.referralDetailsLoading = action.payload;
    },

    setReferralDetailsError: (state, action: PayloadAction<boolean>) => {
      state.referralDetailsError = action.payload;
    },

    setSeasonStatusLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.seasonStartDate) {
        return;
      }
      state.seasonStatusLoading = action.payload;
    },

    setSeasonStatusError: (state, action: PayloadAction<string | null>) => {
      state.seasonStatusError = action.payload;
    },

    resetRewardsState: (state) => {
      Object.assign(state, initialState);
    },

    setOnboardingActiveStep: (state, action: PayloadAction<OnboardingStep>) => {
      state.onboardingActiveStep = action.payload;
    },

    resetOnboarding: (state) => {
      state.onboardingActiveStep = OnboardingStep.INTRO;
      state.onboardingReferralCode = null;
    },

    setOnboardingReferralCode: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.onboardingReferralCode = action.payload;
    },

    setCandidateSubscriptionId: (
      state,
      action: PayloadAction<string | 'pending' | 'error' | 'retry' | null>,
    ) => {
      const previousCandidateId = state.candidateSubscriptionId;
      const newCandidateId = action.payload;

      // Check if candidate ID changed and old value had a value (not null, 'pending', 'error', or 'retry')
      const hasValidPreviousId =
        previousCandidateId &&
        previousCandidateId !== 'pending' &&
        previousCandidateId !== 'error' &&
        previousCandidateId !== 'retry';

      const candidateIdChanged =
        hasValidPreviousId && previousCandidateId !== newCandidateId;

      if (candidateIdChanged) {
        // Reset UI state to initial values
        state.seasonId = initialState.seasonId;
        state.seasonName = initialState.seasonName;
        state.seasonStartDate = initialState.seasonStartDate;
        state.seasonEndDate = initialState.seasonEndDate;
        state.seasonTiers = initialState.seasonTiers;
        state.seasonActivityTypes = initialState.seasonActivityTypes;
        state.referralCode = initialState.referralCode;
        state.refereeCount = initialState.refereeCount;
        state.currentTier = initialState.currentTier;
        state.nextTier = initialState.nextTier;
        state.nextTierPointsNeeded = initialState.nextTierPointsNeeded;
        state.balanceTotal = initialState.balanceTotal;
        state.balanceRefereePortion = initialState.balanceRefereePortion;
        state.balanceUpdatedAt = initialState.balanceUpdatedAt;
        state.seasonShouldInstallNewVersion =
          initialState.seasonShouldInstallNewVersion;
        state.activeBoosts = initialState.activeBoosts;
        state.pointsEvents = initialState.pointsEvents;
        state.unlockedRewards = initialState.unlockedRewards;
      }

      state.candidateSubscriptionId = action.payload;
    },

    setGeoRewardsMetadata: (
      state,
      action: PayloadAction<GeoRewardsMetadata | null>,
    ) => {
      if (action.payload) {
        state.geoLocation = action.payload.geoLocation;
        state.optinAllowedForGeo = action.payload.optinAllowedForGeo;
        state.optinAllowedForGeoLoading = false;
      } else {
        state.geoLocation = null;
        state.optinAllowedForGeo = null;
        state.optinAllowedForGeoLoading = false;
      }
    },

    setGeoRewardsMetadataLoading: (state, action: PayloadAction<boolean>) => {
      state.optinAllowedForGeoLoading = action.payload;
    },

    setGeoRewardsMetadataError: (state, action: PayloadAction<boolean>) => {
      state.optinAllowedForGeoError = action.payload;
    },

    setHideUnlinkedAccountsBanner: (state, action: PayloadAction<boolean>) => {
      state.hideUnlinkedAccountsBanner = action.payload;
    },

    setHideCurrentAccountNotOptedInBanner: (
      state,
      action: PayloadAction<{ accountGroupId: AccountGroupId; hide: boolean }>,
    ) => {
      const existingIndex = state.hideCurrentAccountNotOptedInBanner.findIndex(
        (item) => item.accountGroupId === action.payload.accountGroupId,
      );

      if (existingIndex !== -1) {
        // Update existing entry
        state.hideCurrentAccountNotOptedInBanner[existingIndex].hide =
          action.payload.hide;
      } else {
        // Add new entry
        state.hideCurrentAccountNotOptedInBanner.push({
          accountGroupId: action.payload.accountGroupId,
          hide: action.payload.hide,
        });
      }
    },

    setActiveBoosts: (
      state,
      action: PayloadAction<PointsBoostDto[] | null>,
    ) => {
      state.activeBoosts = action.payload;
      state.activeBoostsError = false; // Reset error when successful
    },
    setActiveBoostsLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.activeBoosts?.length) {
        return;
      }
      state.activeBoostsLoading = action.payload;
    },
    setActiveBoostsError: (state, action: PayloadAction<boolean>) => {
      state.activeBoostsError = action.payload;
    },
    setUnlockedRewards: (state, action: PayloadAction<RewardDto[] | null>) => {
      state.unlockedRewards = action.payload;
      state.unlockedRewardError = false; // Reset error when successful
    },
    setUnlockedRewardLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.unlockedRewards?.length) {
        return;
      }
      state.unlockedRewardLoading = action.payload;
    },
    setUnlockedRewardError: (state, action: PayloadAction<boolean>) => {
      state.unlockedRewardError = action.payload;
    },
    setPointsEvents: (
      state,
      action: PayloadAction<PointsEventDto[] | null>,
    ) => {
      state.pointsEvents = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: RehydrateAction) => {
      if (action.payload?.rewards) {
        return {
          // Reset non-persistent state (state is persisted via controller)
          ...initialState,

          // UI state we want to restore from previous visit
          seasonId: action.payload.rewards.seasonId,
          seasonName: action.payload.rewards.seasonName,
          seasonStartDate: action.payload.rewards.seasonStartDate,
          seasonEndDate: action.payload.rewards.seasonEndDate,
          seasonTiers: action.payload.rewards.seasonTiers,
          seasonActivityTypes: action.payload.rewards.seasonActivityTypes,
          seasonShouldInstallNewVersion:
            action.payload.rewards.seasonShouldInstallNewVersion,
          referralCode: action.payload.rewards.referralCode,
          refereeCount: action.payload.rewards.refereeCount,
          currentTier: action.payload.rewards.currentTier,
          nextTier: action.payload.rewards.nextTier,
          nextTierPointsNeeded: action.payload.rewards.nextTierPointsNeeded,
          balanceTotal: action.payload.rewards.balanceTotal,
          balanceRefereePortion: action.payload.rewards.balanceRefereePortion,
          balanceUpdatedAt: action.payload.rewards.balanceUpdatedAt,
          activeBoosts: action.payload.rewards.activeBoosts,
          pointsEvents: action.payload.rewards.pointsEvents,
          unlockedRewards: action.payload.rewards.unlockedRewards,
          hideUnlinkedAccountsBanner:
            action.payload.rewards.hideUnlinkedAccountsBanner,
          hideCurrentAccountNotOptedInBanner:
            action.payload.rewards.hideCurrentAccountNotOptedInBanner,
        };
      }
      return state;
    });
  },
});

export const {
  setActiveTab,
  setSeasonStatus,
  setReferralDetails,
  setReferralDetailsError,
  setSeasonStatusLoading,
  setSeasonStatusError,
  setReferralDetailsLoading,
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
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
