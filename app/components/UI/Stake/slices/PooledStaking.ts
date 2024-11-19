import type { PooledStake, VaultData } from '@metamask/stake-sdk';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';

// State Types
interface PooledStakingState {
  pooledStakes: PooledStake | null;
  exchangeRate: string;
  vaultData: VaultData | null;
  isEligible: boolean;
  loading: {
    pooledStakes: boolean;
    vaultData: boolean;
    eligibility: boolean;
  };
  error: {
    pooledStakes: string | null;
    vaultData: string | null;
    eligibility: string | null;
  };
}

// Initial State
const initialState: PooledStakingState = {
  pooledStakes: null,
  exchangeRate: '',
  vaultData: null,
  isEligible: false,
  loading: {
    pooledStakes: false,
    vaultData: false,
    eligibility: false,
  },
  error: {
    pooledStakes: null,
    vaultData: null,
    eligibility: null,
  },
};

// Slice Name
export const name = 'staking';

// Slice
const slice = createSlice({
  name,
  initialState,
  reducers: {
    setPooledStakes: (
      state,
      action: PayloadAction<{
        pooledStakes: PooledStake;
        exchangeRate: string;
      }>,
    ) => {
      state.pooledStakes = action.payload.pooledStakes;
      state.exchangeRate = action.payload.exchangeRate;
      state.loading.pooledStakes = false;
      state.error.pooledStakes = null;
    },
    setVaultData: (state, action: PayloadAction<VaultData>) => {
      state.vaultData = action.payload;
      state.loading.vaultData = false;
      state.error.vaultData = null;
    },
    setStakingEligibility: (state, action: PayloadAction<boolean>) => {
      state.isEligible = action.payload;
      state.loading.eligibility = false;
      state.error.eligibility = null;
    },
    setLoading: (
      state,
      action: PayloadAction<{ type: keyof PooledStakingState['loading'] }>,
    ) => {
      state.loading[action.payload.type] = true;
    },
    setError: (
      state,
      action: PayloadAction<{
        type: keyof PooledStakingState['error'];
        error: string;
      }>,
    ) => {
      state.error[action.payload.type] = action.payload.error;
      state.loading[action.payload.type] = false;
    },
  },
});

// Actions & Reducer
const { actions, reducer } = slice;
export default reducer;
export const {
  setPooledStakes,
  setVaultData,
  setStakingEligibility,
  setLoading,
  setError,
} = actions;
// Selectors
const selectPooledStakingState = (state: RootState) => state.staking;

export const selectPooledStakesData = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    pooledStakesData: stakingState.pooledStakes,
    exchangeRate: stakingState.exchangeRate,
    isLoadingPooledStakesData: stakingState.loading.pooledStakes,
    error: stakingState.error.pooledStakes,
  }),
);

export const selectVaultData = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    vaultData: stakingState.vaultData,
    isLoadingVaultData: stakingState.loading.vaultData,
    error: stakingState.error.vaultData,
  }),
);

export const selectStakingEligibility = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    isEligible: stakingState.isEligible,
    isLoadingEligibility: stakingState.loading.eligibility,
    error: stakingState.error.eligibility,
  }),
);
