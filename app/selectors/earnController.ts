import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { EarnControllerState } from '@metamask/earn-controller';

const selectEarnControllerState = (state: RootState) =>
  state.engine.backgroundState.EarnController;

export const selectPooledStakingEligibility = createSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) =>
    earnControllerState.pooled_staking.isEligible,
);

export const selectPooledStakingVaultData = createSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) =>
    earnControllerState.pooled_staking.vaultData,
);
