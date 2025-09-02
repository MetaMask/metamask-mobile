import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusState,
  SeasonTierState,
} from '../../core/Engine/controllers/rewards-controller/types';

export interface RewardsState {
  activeTab: 'overview' | 'activity' | 'levels' | null;
  seasonStatusLoading: boolean;

  // Subscription state
  subscriptionId: string | null;
  tierStatus: SeasonTierState | null;

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
  tierStatus: null,
  balanceTotal: 0,
  balanceRefereePortion: 0,
  balanceUpdatedAt: null,
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
      state.tierStatus = action.payload?.tier || null;
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
  setSubscriptionId,
  setSeasonStatus,
  setReferralDetails,
  setSeasonStatusLoading,
  resetRewardsState,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
