import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusDto,
  SubscriptionDto,
} from '../../core/Engine/controllers/rewards-controller/types';

export interface RewardsState {
  activeTab: 'overview' | 'activity' | 'levels' | null;

  // Subscription state
  subscriptionId: string | null;
  currentTierId: string | null;

  // Balance state
  balanceTotal: number | null;
  balanceRefereePortion: number | null;
  balanceUpdatedAt: Date | null;

  // Referral state
  referralCode: string | null;
  referralLink: string | null;
  refereeCount: number;
}

const initialState: RewardsState = {
  activeTab: null,
  referralCode: null,
  referralLink: null,
  refereeCount: 0,
  subscriptionId: null,
  currentTierId: null,
  balanceTotal: 0,
  balanceRefereePortion: 0,
  balanceUpdatedAt: new Date(),
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
      state.balanceTotal = action.payload?.balance.total || null;
      state.balanceRefereePortion =
        action.payload?.balance.refereePortion || null;
      state.balanceUpdatedAt = action.payload?.balance.updatedAt || null;
      state.currentTierId = action.payload?.currentTierId || null;
    },

    setReferralDetails: (
      state,
      action: PayloadAction<{
        referralCode?: string;
        referralLink?: string;
        refereeCount?: number;
      }>,
    ) => {
      if (action.payload.referralCode !== undefined) {
        state.referralCode = action.payload.referralCode;
      }
      if (action.payload.referralLink !== undefined) {
        state.referralLink = action.payload.referralLink;
      }
      if (action.payload.refereeCount !== undefined) {
        state.refereeCount = action.payload.refereeCount;
      }
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
          isRefreshing: false,
          error: null,
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
  resetRewardsState,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
