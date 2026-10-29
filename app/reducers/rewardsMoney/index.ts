import { createSlice, PayloadAction, type Action } from '@reduxjs/toolkit';
import type {
  ClaimDto,
  CommissionEntryView,
  EarningsSummaryDto,
  LedgerEarningEntryDto,
  LedgerEntryDto,
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
  /**
   * First page of the unified earnings ledger (accruals and settled claims),
   * keyed by Hydra profile id.
   */
  earningsHistory: Record<string, LedgerEntryDto[]>;
  /**
   * First page of `GET /earnings/claim/me`, the open claims the ledger does
   * not carry, keyed by Hydra profile id.
   */
  inFlightClaims: Record<string, ClaimDto[]>;
  /**
   * Epoch ms until Claim is enabled again after a refusal's `Retry-After`,
   * keyed by Hydra profile id. Survives leaving the Earnings tab.
   */
  claimWaitingUntil: Record<string, number>;
  /**
   * Claim button lock for one profile. `in_progress` is a claim this session
   * has not finished. `awaiting_fresh_summary` is a paid claim whose balance
   * refresh failed, or an address this phone cannot sign. `summaryKey` is the
   * claimable figures that lock was taken against. Dropped on rehydrate, so a
   * killed session cannot leave Claim disabled.
   */
  claimLocks: Record<string, ClaimLock>;
  /**
   * Referral code from the `ref` param of the last deeplink the user
   * continued past the interstitial, waiting for the invite sheet. A newer
   * link replaces it. Dropped on rehydrate: the code belongs to the session
   * that opened the link.
   */
  pendingReferralCode: string | null;
}

export type ClaimLockStatus = 'in_progress' | 'awaiting_fresh_summary';

export interface ClaimLock {
  status: ClaimLockStatus;
  summaryKey: string;
}

export const initialState: RewardsMoneyState = {
  referralMe: {},
  earningsSummary: {},
  referralFunnel: {},
  commissions: {},
  cashbackLedger: {},
  earningsHistory: {},
  inFlightClaims: {},
  claimWaitingUntil: {},
  claimLocks: {},
  pendingReferralCode: null,
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
    setEarningsHistory: (
      state,
      action: PayloadAction<{
        profileId: string;
        items: LedgerEntryDto[];
      }>,
    ) => {
      state.earningsHistory[action.payload.profileId] = action.payload.items;
    },
    setInFlightClaims: (
      state,
      action: PayloadAction<{
        profileId: string;
        claims: ClaimDto[];
      }>,
    ) => {
      state.inFlightClaims[action.payload.profileId] = action.payload.claims;
    },
    setClaimWaitingUntil: (
      state,
      action: PayloadAction<{
        profileId: string;
        until: number | null;
      }>,
    ) => {
      if (action.payload.until === null) {
        delete state.claimWaitingUntil[action.payload.profileId];
        return;
      }
      state.claimWaitingUntil[action.payload.profileId] = action.payload.until;
    },
    setClaimLock: (
      state,
      action: PayloadAction<{
        profileId: string;
        lock: ClaimLock | null;
      }>,
    ) => {
      if (action.payload.lock === null) {
        delete state.claimLocks[action.payload.profileId];
        return;
      }
      state.claimLocks[action.payload.profileId] = action.payload.lock;
    },
    setPendingReferralCode: (state, action: PayloadAction<string>) => {
      state.pendingReferralCode = action.payload;
    },
    clearPendingReferralCode: (state) => {
      state.pendingReferralCode = null;
    },
    resetRewardsMoneyState: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(
      'persist/REHYDRATE',
      (state, action: RehydrateAction): RewardsMoneyState => {
        const persisted = action.payload?.rewardsMoney ?? state;
        return {
          ...initialState,
          referralMe: settleEntries(persisted.referralMe),
          earningsSummary: settleEntries(persisted.earningsSummary),
          referralFunnel: settleEntries(persisted.referralFunnel),
          commissions: persisted.commissions ?? initialState.commissions,
          cashbackLedger:
            persisted.cashbackLedger ?? initialState.cashbackLedger,
          earningsHistory:
            persisted.earningsHistory ?? initialState.earningsHistory,
          inFlightClaims:
            persisted.inFlightClaims ?? initialState.inFlightClaims,
          claimWaitingUntil:
            persisted.claimWaitingUntil ?? initialState.claimWaitingUntil,
          // A lock belongs to the running session. Restoring one would leave
          // Claim disabled after the process that owned the claim was gone.
          claimLocks: {},
          pendingReferralCode: null,
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
  setReferralFunnelLoading,
  setReferralFunnelError,
  setReferralFunnel,
  setCommissions,
  setCashbackLedger,
  setEarningsHistory,
  setInFlightClaims,
  setClaimWaitingUntil,
  setClaimLock,
  setPendingReferralCode,
  clearPendingReferralCode,
  resetRewardsMoneyState,
} = rewardsMoneySlice.actions;

export default rewardsMoneySlice.reducer;
