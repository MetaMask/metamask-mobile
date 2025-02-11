import type {
  PooledStake,
  VaultDailyApy,
  VaultApyAverages,
} from '@metamask/stake-sdk';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';

interface PooledStakingState {
  pooledStakes: PooledStake;
  exchangeRate: string;
  vaultApys: VaultDailyApy[];
  vaultApyAverages: VaultApyAverages;
}

export const initialState: PooledStakingState = {
  pooledStakes: {} as PooledStake,
  exchangeRate: '',
  vaultApys: [],
  vaultApyAverages: {} as VaultApyAverages,
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
    setVaultApys: (state, action: PayloadAction<VaultDailyApy[]>) => {
      state.vaultApys = action.payload;
    },
    setVaultApyAverages: (state, action: PayloadAction<VaultApyAverages>) => {
      state.vaultApyAverages = action.payload;
    },
  },
});

const { actions, reducer } = slice;
export default reducer;
export const { setPooledStakes, setVaultApys, setVaultApyAverages } = actions;

// Selectors
const selectPooledStakingState = (state: RootState) => state.staking;

export const selectPooledStakesData = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    pooledStakesData: stakingState.pooledStakes,
    exchangeRate: stakingState.exchangeRate,
  }),
);

export const selectVaultApys = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    vaultApys: stakingState.vaultApys,
  }),
);

export const selectVaultApyAverages = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    vaultApyAverages: stakingState.vaultApyAverages,
  }),
);
