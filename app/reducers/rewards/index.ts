import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusState,
  SeasonTierDto,
  GeoRewardsMetadata,
  PointsBoostDto,
  RewardDto,
  PointsEventDto,
} from '../../core/Engine/controllers/rewards-controller/types';
import { OnboardingStep } from './types';
import { CaipAccountId } from '@metamask/utils';

export interface AccountOptInBannerInfoStatus {
  caipAccountId: CaipAccountId;
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
    },

    setCandidateSubscriptionId: (
      state,
      action: PayloadAction<string | 'pending' | 'error' | 'retry' | null>,
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
      action: PayloadAction<{ accountId: CaipAccountId; hide: boolean }>,
    ) => {
      const existingIndex = state.hideCurrentAccountNotOptedInBanner.findIndex(
        (item) => item.caipAccountId === action.payload.accountId,
      );

      if (existingIndex !== -1) {
        // Update existing entry
        state.hideCurrentAccountNotOptedInBanner[existingIndex].hide =
          action.payload.hide;
      } else {
        // Add new entry
        state.hideCurrentAccountNotOptedInBanner.push({
          caipAccountId: action.payload.accountId,
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
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
