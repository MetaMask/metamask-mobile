import type { VaultDailyApy, VaultApyAverages } from '@metamask/stake-sdk';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import { DEFAULT_VAULT_APY_AVERAGES } from '../../../../components/UI/Stake/constants';

interface PooledStakingState {
  vaultApys: VaultDailyApy[];
  vaultApyAverages: VaultApyAverages;
}

export const initialState: PooledStakingState = {
  vaultApys: [],
  vaultApyAverages: DEFAULT_VAULT_APY_AVERAGES,
};

export const name = 'staking';

const slice = createSlice({
  name,
  initialState,
  reducers: {
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
export const { setVaultApys, setVaultApyAverages } = actions;

// Selectors
const selectPooledStakingState = (state: RootState) => state.staking;

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
