import type {
  PooledStake,
  VaultData,
  VaultAprs,
  VaultDailyApys,
} from '@metamask/stake-sdk';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';

interface PooledStakingState {
  pooledStakes: PooledStake;
  exchangeRate: string;
  vaultData: VaultData;
  vaultAprs: VaultAprs;
  vaultApys: VaultDailyApys[];
  isEligible: boolean;
}

export const initialState: PooledStakingState = {
  pooledStakes: {} as PooledStake,
  exchangeRate: '',
  vaultData: {} as VaultData,
  vaultAprs: {} as VaultAprs,
  vaultApys: [],
  isEligible: false,
};

export const name = 'staking';

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
    },
    setVaultData: (state, action: PayloadAction<VaultData>) => {
      state.vaultData = action.payload;
    },
    setVaultAprs: (state, action: PayloadAction<VaultAprs>) => {
      state.vaultAprs = action.payload;
    },
    setVaultApys: (state, action: PayloadAction<VaultDailyApys[]>) => {
      state.vaultApys = action.payload;
    },
    setStakingEligibility: (state, action: PayloadAction<boolean>) => {
      state.isEligible = action.payload;
    },
  },
});

const { actions, reducer } = slice;
export default reducer;
export const {
  setPooledStakes,
  setVaultData,
  setVaultAprs,
  setVaultApys,
  setStakingEligibility,
} = actions;

// Selectors
const selectPooledStakingState = (state: RootState) => state.staking;

export const selectPooledStakesData = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    pooledStakesData: stakingState.pooledStakes,
    exchangeRate: stakingState.exchangeRate,
  }),
);

export const selectVaultData = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    vaultData: stakingState.vaultData,
  }),
);

export const selectVaultAprs = createSelector(
  selectPooledStakingState,
  (stakingStake) => ({
    vaultAprs: stakingStake.vaultAprs,
  }),
);

export const selectVaultApys = createSelector(
  selectPooledStakingState,
  (stakingStake) => ({
    vaultApys: stakingStake.vaultApys,
  }),
);

export const selectStakingEligibility = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    isEligible: stakingState.isEligible,
  }),
);
