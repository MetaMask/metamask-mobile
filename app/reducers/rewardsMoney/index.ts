import { createSlice, PayloadAction, type Action } from '@reduxjs/toolkit';
import type {
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../core/Engine/controllers/rewards-money-controller/types';

interface ProfileEntry<TData> {
  loading: boolean;
  error: boolean;
  data: TData | null;
}

export type ReferralMeEntry = ProfileEntry<ReferralMeDto>;

export type EarningsSummaryEntry = ProfileEntry<EarningsSummaryDto>;

export interface RewardsMoneyState {
  referralMe: Record<string, ReferralMeEntry>;
  earningsSummary: Record<string, EarningsSummaryEntry>;
}

export const initialState: RewardsMoneyState = {
  referralMe: {},
  earningsSummary: {},
};

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    rewardsMoney?: RewardsMoneyState;
  };
}

function settleEntries<TData>(
  entries: Record<string, ProfileEntry<TData>> | undefined,
): Record<string, ProfileEntry<TData>> {
  if (!entries) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(entries).map(([profileId, entry]) => [
      profileId,
      { data: entry?.data ?? null, loading: false, error: false },
    ]),
  );
}

function getOrCreateEntry<TData>(
  map: Record<string, ProfileEntry<TData>>,
  profileId: string,
): ProfileEntry<TData> {
  if (!map[profileId]) {
    map[profileId] = { loading: false, error: false, data: null };
  }
  return map[profileId];
}

const rewardsMoneySlice = createSlice({
  name: 'rewardsMoney',
  initialState,
  reducers: {
    setReferralMeLoading: (
      state,
      action: PayloadAction<{ profileId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateEntry(
        state.referralMe,
        action.payload.profileId,
      );
      entry.loading = action.payload.loading;
    },
    setReferralMeError: (
      state,
      action: PayloadAction<{ profileId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateEntry(
        state.referralMe,
        action.payload.profileId,
      );
      entry.error = action.payload.error;
    },
    setReferralMe: (
      state,
      action: PayloadAction<{ profileId: string; data: ReferralMeDto | null }>,
    ) => {
      const entry = getOrCreateEntry(
        state.referralMe,
        action.payload.profileId,
      );
      entry.loading = false;
      entry.error = false;
      entry.data = action.payload.data;
    },
    setEarningsSummaryLoading: (
      state,
      action: PayloadAction<{ profileId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateEntry(
        state.earningsSummary,
        action.payload.profileId,
      );
      entry.loading = action.payload.loading;
    },
    setEarningsSummaryError: (
      state,
      action: PayloadAction<{ profileId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateEntry(
        state.earningsSummary,
        action.payload.profileId,
      );
      entry.error = action.payload.error;
    },
    setEarningsSummary: (
      state,
      action: PayloadAction<{
        profileId: string;
        data: EarningsSummaryDto | null;
      }>,
    ) => {
      const entry = getOrCreateEntry(
        state.earningsSummary,
        action.payload.profileId,
      );
      entry.loading = false;
      entry.error = false;
      entry.data = action.payload.data;
    },
    resetRewardsMoneyState: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(
      'persist/REHYDRATE',
      (state, action: RehydrateAction): RewardsMoneyState => {
        const persisted = action.payload?.rewardsMoney ?? state;
        return {
          referralMe: settleEntries(persisted.referralMe),
          earningsSummary: settleEntries(persisted.earningsSummary),
        };
      },
    );
  },
});

export const {
  setReferralMeLoading,
  setReferralMeError,
  setReferralMe,
  setEarningsSummaryLoading,
  setEarningsSummaryError,
  setEarningsSummary,
  resetRewardsMoneyState,
} = rewardsMoneySlice.actions;

export default rewardsMoneySlice.reducer;
