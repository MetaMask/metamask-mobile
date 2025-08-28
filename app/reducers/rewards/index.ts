import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusDto,
  SeasonTierDto,
  SubscriptionDto,
} from '../../core/Engine/controllers/rewards-controller/types';

export interface RewardsState {
  activeTab: 'overview' | 'activity' | 'levels' | null;
  seasonStatusLoading: boolean;

  // Subscription state
  subscriptionId: string | null;
  currentTierId: string | null;

  // Season state
  seasonName: string | null;
  seasonStartDate: Date | null;
  seasonEndDate: Date | null;
  seasonTiers: SeasonTierDto[];

  // Balance state
  balanceTotal: number | null;
  balanceRefereePortion: number | null;
  balanceUpdatedAt: Date | null;

  // Referral state
  referralCode: string | null;
  refereeCount: number;
}

export const initialState: RewardsState = {
  activeTab: 'overview',
  seasonStatusLoading: false,
  referralCode: null,
  refereeCount: 0,
  subscriptionId: null,
  currentTierId: null,
  balanceTotal: 0,
  balanceRefereePortion: 0,
  balanceUpdatedAt: null,
  seasonName: null,
  seasonStartDate: null,
  seasonEndDate: null,
  seasonTiers: [],
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

    setSubscription: (state, action: PayloadAction<SubscriptionDto | null>) => {
      state.subscriptionId = action.payload?.id || null;
    },

    setSeasonStatus: (state, action: PayloadAction<SeasonStatusDto | null>) => {
      // Season state
      state.seasonName = action.payload?.season.name || null;
      state.seasonStartDate = action.payload?.season.startDate || null;
      state.seasonEndDate = action.payload?.season.endDate || null;
      state.seasonTiers = action.payload?.season.tiers || [];

      // Balance state
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
      state.balanceUpdatedAt = action.payload?.balance?.updatedAt || null;
      state.currentTierId = action.payload?.currentTierId || null;
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
  setSubscription,
  setSeasonStatus,
  setReferralDetails,
  setSeasonStatusLoading,
  resetRewardsState,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
