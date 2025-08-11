import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusState,
  SeasonTierDto,
  GeoRewardsMetadata,
} from '../../core/Engine/controllers/rewards-controller/types';
import { OnboardingStep } from './types';

export interface RewardsState {
  activeTab: 'overview' | 'activity' | 'levels' | null;
  seasonStatusLoading: boolean;

  // Season state
  seasonName: string | null;
  seasonStartDate: Date | null;
  seasonEndDate: Date | null;
  seasonTiers: SeasonTierDto[];

  // Subscription state
  subscriptionId: string | null;

  // Subscription Referral state
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

  // Geolocation state
  geoLocation: string | null;
  optinAllowedForGeo: boolean;
}

export const initialState: RewardsState = {
  activeTab: 'overview',
  seasonStatusLoading: false,

  seasonName: null,
  seasonStartDate: null,
  seasonEndDate: null,
  seasonTiers: [],

  referralCode: null,
  refereeCount: 0,
  subscriptionId: null,

  currentTier: null,
  nextTier: null,
  nextTierPointsNeeded: null,

  balanceTotal: 0,
  balanceRefereePortion: 0,
  balanceUpdatedAt: null,

  onboardingActiveStep: OnboardingStep.STEP_1,
  geoLocation: null,
  optinAllowedForGeo: false,
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

    setSubscriptionId: (state, action: PayloadAction<string | null>) => {
      state.subscriptionId = action.payload || null;
    },

    setSeasonStatus: (
      state,
      action: PayloadAction<SeasonStatusState | null>,
    ) => {
      // Season state
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
    },

    setSeasonStatusLoading: (state, action: PayloadAction<boolean>) => {
      state.seasonStatusLoading = action.payload;
    },

    resetRewardsState: (state) => {
      Object.assign(state, initialState);
    },

    setOnboardingActiveStep: (state, action: PayloadAction<OnboardingStep>) => {
      state.onboardingActiveStep = action.payload;
    },

    resetOnboarding: (state) => {
      state.onboardingActiveStep = OnboardingStep.STEP_1;
    },

    setGeoRewardsMetadata: (
      state,
      action: PayloadAction<GeoRewardsMetadata | null>,
    ) => {
      if (action.payload) {
        state.geoLocation = action.payload.geoLocation;
        state.optinAllowedForGeo = action.payload.optinAllowedForGeo;
      } else {
        state.geoLocation = null;
        state.optinAllowedForGeo = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: RehydrateAction) => {
      if (action.payload?.rewards) {
        return {
          ...action.payload.rewards,
          // Reset non-persistent state
          seasonStatusLoading: false,
        };
      }
      return state;
    });
  },
});

export const {
  setActiveTab,
  setSubscriptionId,
  setSeasonStatus,
  setReferralDetails,
  setSeasonStatusLoading,
  resetRewardsState,
  setOnboardingActiveStep,
  resetOnboarding,
  setGeoRewardsMetadata,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
