import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { areAddressesEqual } from '../../../../util/address';

export interface PersistedMoneyBalance {
  /** Money account address this balance belongs to. */
  address: string;
  /** Formatted fiat balance, e.g. "$2,384.34". */
  value: string;
  /** Currency code the value was formatted in, e.g. "USD". */
  currency: string;
  /** Epoch milliseconds when the balance was last successfully fetched. */
  updatedAt: number;
}

export interface PersistedRedeemableRaw {
  /** Money account address this redeemable amount belongs to. */
  address: string;
  /** Exact atomic (raw) redeemable mUSD amount for that account. */
  raw: string;
}

export interface PersistedLocalMoneyFlow {
  /** Money account address the confirmed transaction moved funds for. */
  address: string;
  /** Epoch milliseconds when that transaction was confirmed locally. */
  confirmedAt: number;
}

export interface MoneyBalanceSliceState {
  lastKnownBalance: PersistedMoneyBalance | null;
  redeemable: PersistedRedeemableRaw | null;
  /**
   * The most recent locally-confirmed transaction that moved the Money Account
   * balance, in either direction.
   *
   * The live balance reflects such a transaction immediately, while anything
   * derived from the backend's on-chain ingest (e.g. Rewards qualifying
   * deposits) only catches up on the next ingest run. Consumers compare this
   * against their own freshness watermark to tell the user their figure is
   * still catching up. Persisted, because the ingest lag outlives a session.
   *
   * Builds before the marker carried an address persisted a bare epoch-ms
   * number here. That shape cannot be attributed to an account, so
   * {@link getUsableLastLocalFlowConfirmedAt} discards it. The key name is kept
   * so redux-persist keeps reconciling into the same slot.
   */
  lastLocalFlowConfirmedAt: PersistedLocalMoneyFlow | number | null;
}

export const initialState: MoneyBalanceSliceState = {
  lastKnownBalance: null,
  redeemable: null,
  lastLocalFlowConfirmedAt: null,
};

const name = 'moneyBalance';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    setLastKnownMoneyBalance: (
      state,
      action: PayloadAction<PersistedMoneyBalance>,
    ) => {
      state.lastKnownBalance = action.payload;
    },
    clearLastKnownMoneyBalance: (state) => {
      state.lastKnownBalance = null;
    },
    setMoneyAccountRedeemableRaw: (
      state,
      action: PayloadAction<PersistedRedeemableRaw | null>,
    ) => {
      state.redeemable = action.payload;
    },
    setLastLocalMoneyFlow: (
      state,
      action: PayloadAction<PersistedLocalMoneyFlow>,
    ) => {
      state.lastLocalFlowConfirmedAt = action.payload;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;

const selectMoneyBalanceState = (state: RootState) => state[name];

export const selectLastKnownMoneyBalance = createSelector(
  selectMoneyBalanceState,
  (moneyBalance) => moneyBalance.lastKnownBalance,
);

export const selectMoneyAccountRedeemable = createSelector(
  selectMoneyBalanceState,
  (moneyBalance) => moneyBalance.redeemable,
);

export const selectLastLocalMoneyFlow = createSelector(
  selectMoneyBalanceState,
  // Falls back to null for state persisted before this field existed.
  (moneyBalance) => moneyBalance.lastLocalFlowConfirmedAt ?? null,
);

/**
 * A cached redeemable is only safe to use as the exact source amount when it
 * belongs to the Money Account currently funding the transaction — otherwise a
 * stale value from a previously viewed account could be sent to the quote.
 */
export const getUsableMoneyAccountRedeemableRaw = (
  redeemable: PersistedRedeemableRaw | null | undefined,
  address: string | undefined,
): string | undefined =>
  redeemable &&
  address &&
  areAddressesEqual(redeemable.address, address) &&
  redeemable.raw
    ? redeemable.raw
    : undefined;

/**
 * A confirmed local flow only says something about the account it moved funds
 * for. Reading it without that check would let a marker left by a previously
 * active Money Account tell the current one its figures are catching up, when
 * nothing local has happened on it at all.
 *
 * Also discards the bare-timestamp shape persisted by builds before the marker
 * carried an address, which cannot be attributed to any account.
 */
export const getUsableLastLocalFlowConfirmedAt = (
  marker: PersistedLocalMoneyFlow | number | null | undefined,
  address: string | undefined,
): number | undefined =>
  typeof marker === 'object' &&
  marker !== null &&
  address &&
  areAddressesEqual(marker.address, address)
    ? marker.confirmedAt
    : undefined;

/**
 * A persisted balance is only safe to show as the "last known" figure when it
 * belongs to the account currently in view and was formatted in the currency
 * currently selected — otherwise the figure would be stale in a misleading way
 * (wrong account) or numerically wrong (different currency conversion).
 */
export const isPersistedMoneyBalanceUsable = (
  persisted: PersistedMoneyBalance | null | undefined,
  { address, currency }: { address?: string; currency: string },
): persisted is PersistedMoneyBalance =>
  Boolean(persisted) &&
  Boolean(address) &&
  areAddressesEqual(persisted?.address ?? '', address ?? '') &&
  persisted?.currency === currency;

export const {
  setLastKnownMoneyBalance,
  clearLastKnownMoneyBalance,
  setMoneyAccountRedeemableRaw,
  setLastLocalMoneyFlow,
} = actions;
