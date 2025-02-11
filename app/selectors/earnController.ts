import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { EarnControllerState } from '@metamask/earn-controller';
import { createDeepEqualSelector } from './util';

const selectEarnControllerState = (state: RootState) =>
  state.engine.backgroundState.EarnController;

export const selectPooledStakingEligibility = createSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) =>
    earnControllerState.pooled_staking.isEligible,
);

// Shallow equality check is safe since @metamask/earn-controller creates new vaultData object on refresh.
export const selectPooledStakingVaultData = createSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) =>
    earnControllerState.pooled_staking.vaultData,
);

// Shallow equality check is safe since @metamask/earn-controller create new pooledStakes object on refresh.
export const selectPoolStakesData = createDeepEqualSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) =>
    earnControllerState.pooled_staking.pooledStakes,
);

export const selectPooledStakingExchangeRate = createSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) =>
    earnControllerState.pooled_staking.exchangeRate,
);
