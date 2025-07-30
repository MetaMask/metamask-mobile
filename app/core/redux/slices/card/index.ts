import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { getCardholder } from '../../../../components/UI/Card/util/getCardholder';

export interface CardSliceState {
  cardholderAccounts: string[];
  lastUpdated: number | null;
  isLoading: boolean;
  error: string | null;
  isLoaded: boolean;
}

export const initialState: CardSliceState = {
  cardholderAccounts: [],
  lastUpdated: null,
  isLoading: false,
  error: null,
  isLoaded: false,
};

// Async thunk for loading cardholder accounts
export const loadCardholderAccounts = createAsyncThunk(
  'card/loadCardholderAccounts',
  getCardholder,
);

const name = 'card';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    resetCardState: () => initialState,
    clearCardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCardholderAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadCardholderAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cardholderAccounts = action.payload ?? [];
        state.lastUpdated = Date.now();
        state.isLoaded = true;
        state.error = null;
      })
      .addCase(loadCardholderAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isLoaded = true;
      });
  },
});

const { actions, reducer } = slice;

export default reducer;

// Base selectors
const selectCardState = (state: RootState) => state[name];

// Derived selectors using createSelector
export const selectCardholderAccounts = createSelector(
  [selectCardState],
  (card) => card.cardholderAccounts,
);

export const selectIsCardholder = createSelector(
  [selectCardholderAccounts],
  (cardholderAccounts) => cardholderAccounts.length > 0,
);

export const selectIsCardDataLoaded = createSelector(
  [selectCardState],
  (card) => card.isLoaded,
);

export const selectCardLoading = createSelector(
  [selectCardState],
  (card) => card.isLoading,
);

export const selectCardError = createSelector(
  [selectCardState],
  (card) => card.error,
);

export const selectCardLastUpdated = createSelector(
  [selectCardState],
  (card) => card.lastUpdated,
);

// Actions
export const { resetCardState, clearCardError } = actions;
