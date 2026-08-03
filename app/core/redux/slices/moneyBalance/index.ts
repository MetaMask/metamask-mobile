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

export interface MoneyBalanceSliceState {
  lastKnownBalance: PersistedMoneyBalance | null;
  hasPendingUserOp: boolean;
}

export const initialState: MoneyBalanceSliceState = {
  lastKnownBalance: null,
  hasPendingUserOp: false,
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
      state.hasPendingUserOp = true;
    },
    clearMoneyBalanceUserOp: (state) => {
      state.hasPendingUserOp = false;
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

export const selectHasPendingMoneyBalanceUserOp = createSelector(
  selectMoneyBalanceState,
  (moneyBalance) => moneyBalance.hasPendingUserOp,
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
  clearMoneyBalanceUserOp,
} = actions;
