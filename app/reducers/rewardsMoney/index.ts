import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  CommissionEntryView,
  EarningsSummaryDto,
  LedgerEarningEntryDto,
  ReferralFunnelDto,
  ReferralMeDto,
} from '../../core/Engine/controllers/rewards-money-controller/types';

interface ProfileEntry<TData> {
  loading: boolean;
  error: boolean;
  data: TData | null;
}

export type ReferralMeEntry = ProfileEntry<ReferralMeDto>;

export type EarningsSummaryEntry = ProfileEntry<EarningsSummaryDto>;

export type ReferralFunnelEntry = ProfileEntry<ReferralFunnelDto>;

export interface RewardsMoneyState {
  referralMe: Record<string, ReferralMeEntry>;
  earningsSummary: Record<string, EarningsSummaryEntry>;
  referralFunnel: Record<string, ReferralFunnelEntry>;
  /** First page of follow-trade commissions, keyed by Hydra profile id. */
  commissions: Record<string, CommissionEntryView[]>;
  /** First page of self-earned cashback ledger rows, keyed by Hydra profile id. */
  cashbackLedger: Record<string, LedgerEarningEntryDto[]>;
}

export const initialState: RewardsMoneyState = {
  referralMe: {},
  earningsSummary: {},
  referralFunnel: {},
  commissions: {},
  cashbackLedger: {},
};

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
    setReferralFunnelLoading: (
      state,
      action: PayloadAction<{ profileId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateEntry(
        state.referralFunnel,
        action.payload.profileId,
      );
      entry.loading = action.payload.loading;
    },
    setReferralFunnelError: (
      state,
      action: PayloadAction<{ profileId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateEntry(
        state.referralFunnel,
        action.payload.profileId,
      );
      entry.error = action.payload.error;
    },
    setReferralFunnel: (
      state,
      action: PayloadAction<{
        profileId: string;
        data: ReferralFunnelDto | null;
      }>,
    ) => {
      const entry = getOrCreateEntry(
        state.referralFunnel,
        action.payload.profileId,
      );
      entry.loading = false;
      entry.error = false;
      entry.data = action.payload.data;
    },
    setCommissions: (
      state,
      action: PayloadAction<{
        profileId: string;
        items: CommissionEntryView[];
      }>,
    ) => {
      state.commissions[action.payload.profileId] = action.payload.items;
    },
    setCashbackLedger: (
      state,
      action: PayloadAction<{
        profileId: string;
        items: LedgerEarningEntryDto[];
      }>,
    ) => {
      state.cashbackLedger[action.payload.profileId] = action.payload.items;
    },
    resetRewardsMoneyState: () => initialState,
  },
});

export const {
  setReferralMeLoading,
  setReferralMeError,
  setReferralMe,
  setEarningsSummaryLoading,
  setEarningsSummaryError,
  setEarningsSummary,
  setReferralFunnelLoading,
  setReferralFunnelError,
  setReferralFunnel,
  setCommissions,
  setCashbackLedger,
  resetRewardsMoneyState,
} = rewardsMoneySlice.actions;

export default rewardsMoneySlice.reducer;
