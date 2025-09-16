import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusState,
  SeasonTierDto,
  GeoRewardsMetadata,
  PointsBoostDto,
} from '../../core/Engine/controllers/rewards-controller/types';
import { OnboardingStep } from './types';
import Logger from '../../util/Logger';

export interface RewardsState {
  activeTab: 'overview' | 'activity' | 'levels' | null;
  seasonStatusLoading: boolean;

  // Season state
  seasonId: string | null;
  seasonName: string | null;
  seasonStartDate: Date | null;
  seasonEndDate: Date | null;
  seasonTiers: SeasonTierDto[];

  // Subscription Referral state
  referralDetailsLoading: boolean;
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

  // Candidate subscription state
  candidateSubscriptionId: string | 'pending' | 'error' | null;

  // Geolocation state
  geoLocation: string | null;
  optinAllowedForGeo: boolean;
  optinAllowedForGeoLoading: boolean;

  // UI preferences
  hideUnlinkedAccountsBanner: boolean;

  // Points Boost state
  activeBoosts: PointsBoostDto[] | null;
  activeBoostsLoading: boolean;
  activeBoostsError: boolean;
}

export const initialState: RewardsState = {
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

  activeBoosts: null,
  activeBoostsLoading: false,
  activeBoostsError: false,
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
      action: PayloadAction<'overview' | 'activity' | 'levels' | null>,
    ) => {
      state.activeTab = action.payload;
    },

    setSeasonStatus: (
      state,
      action: PayloadAction<SeasonStatusState | null>,
    ) => {
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

      // Season Balance state
      state.balanceTotal =
        action.payload?.balance &&
        typeof action.payload.balance.total === 'number'
          ? action.payload.balance.total
          : null;
      state.balanceRefereePortion =
        action.payload?.balance &&
        typeof action.payload.balance.refereePortion === 'number'
          ? action.payload.balance.refereePortion
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
      }>,
    ) => {
      if (action.payload.referralCode !== undefined) {
        state.referralCode = action.payload.referralCode;
      }
      if (action.payload.refereeCount !== undefined) {
        state.refereeCount = action.payload.refereeCount;
      }
      state.referralDetailsLoading = false;
    },

    setReferralDetailsLoading: (state, action: PayloadAction<boolean>) => {
      state.referralDetailsLoading = action.payload;
    },

    setSeasonStatusLoading: (state, action: PayloadAction<boolean>) => {
      state.seasonStatusLoading = action.payload;
    },

    resetRewardsState: (state) => {
      Object.assign(state, initialState);
    },

    setOnboardingActiveStep: (state, action: PayloadAction<OnboardingStep>) => {
      Logger.log('setOnboardingActiveStep', action.payload);
      state.onboardingActiveStep = action.payload;
    },

    resetOnboarding: (state) => {
      state.onboardingActiveStep = OnboardingStep.INTRO;
    },

    setCandidateSubscriptionId: (
      state,
      action: PayloadAction<string | 'pending' | 'error' | null>,
    ) => {
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
        state.optinAllowedForGeo = false;
        state.optinAllowedForGeoLoading = false;
      }
    },

    setGeoRewardsMetadataLoading: (state, action: PayloadAction<boolean>) => {
      state.optinAllowedForGeoLoading = action.payload;
    },

    setHideUnlinkedAccountsBanner: (state, action: PayloadAction<boolean>) => {
      state.hideUnlinkedAccountsBanner = action.payload;
    },

    setActiveBoosts: (state, action: PayloadAction<PointsBoostDto[]>) => {
      state.activeBoosts = action.payload;
      state.activeBoostsError = false; // Reset error when successful
    },
    setActiveBoostsLoading: (state, action: PayloadAction<boolean>) => {
      state.activeBoostsLoading = action.payload;
    },
    setActiveBoostsError: (state, action: PayloadAction<boolean>) => {
      state.activeBoostsError = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: RehydrateAction) => {
      if (action.payload?.rewards) {
        return {
          // Reset non-persistent state (state is persisted via controller)
          ...initialState,
          // Restore only a few persistent state
          hideUnlinkedAccountsBanner:
            action.payload.rewards.hideUnlinkedAccountsBanner,
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
  setActiveBoostsError,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
