import type {
  PooledStake,
  VaultData,
  VaultDailyApy,
  VaultApyAverages,
} from '@metamask/stake-sdk';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import { DEFAULT_VAULT_APY_AVERAGES } from '../../../../components/UI/Stake/constants';

interface PooledStakingState {
  pooledStakes: PooledStake;
  exchangeRate: string;
  vaultData: VaultData;
  vaultApys: VaultDailyApy[];
  vaultApyAverages: VaultApyAverages;
  isEligible: boolean;
}

export const initialState: PooledStakingState = {
  pooledStakes: {} as PooledStake,
  exchangeRate: '',
  vaultData: {} as VaultData,
  vaultApys: [],
  vaultApyAverages: DEFAULT_VAULT_APY_AVERAGES,
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
    setVaultApys: (state, action: PayloadAction<VaultDailyApy[]>) => {
      state.vaultApys = action.payload;
    },
    setVaultApyAverages: (state, action: PayloadAction<VaultApyAverages>) => {
      state.vaultApyAverages = action.payload;
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
  setVaultApys,
  setVaultApyAverages,
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

export const selectStakingEligibility = createSelector(
  selectPooledStakingState,
  (stakingState) => ({
    isEligible: stakingState.isEligible,
  }),
);
