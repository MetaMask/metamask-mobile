import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { areAddressesEqual } from '../../../../util/address';

export interface PersistedMoneyBalance {
  /** Money account address this balance belongs to. */
  address: string;
  /** Formatted fiat balance, e.g. "$2,384.34". */
  value: string;
  amount?: number;
  /** Currency code the value was formatted in, e.g. "USD". */
  currency: string;
  /** Epoch milliseconds when the balance was last successfully fetched. */
  updatedAt: number;
}

/**
 * Lifecycle of the signal a Money-affecting transaction raises.
 *
 * `refreshing` is the transaction confirmed with the balance refresh still
 * running, so a figure that has not moved yet means nothing. `pending` is that
 * refresh over and its figure waiting to be rendered; if the figure turns out
 * to already be on screen there is nothing left to roll, so the signal is
 * dropped rather than left for a later poll to spend. `none` is no user
 * operation outstanding.
 */
export type MoneyBalanceUserOpStatus = 'none' | 'refreshing' | 'pending';

export interface MoneyBalanceSliceState {
  lastKnownBalance: PersistedMoneyBalance | null;
  userOpStatus: MoneyBalanceUserOpStatus;
}

export const initialState: MoneyBalanceSliceState = {
  lastKnownBalance: null,
  userOpStatus: 'none',
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
    markMoneyBalanceUserOp: (state) => {
      state.userOpStatus = 'refreshing';
    },
    settleMoneyBalanceUserOp: (state) => {
      // Only an operation that was still refreshing has a figure to hand over.
      if (state.userOpStatus === 'refreshing') {
        state.userOpStatus = 'pending';
      }
    },
    clearMoneyBalanceUserOp: (state) => {
      state.userOpStatus = 'none';
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

export const selectMoneyBalanceUserOpStatus = createSelector(
  selectMoneyBalanceState,
  (moneyBalance) => moneyBalance.userOpStatus,
);

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
  markMoneyBalanceUserOp,
  settleMoneyBalanceUserOp,
  clearMoneyBalanceUserOp,
} = actions;
