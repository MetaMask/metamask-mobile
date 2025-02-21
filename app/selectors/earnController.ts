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

export const selectPooledStakingVaultMetadata = createDeepEqualSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) =>
    earnControllerState.pooled_staking.vaultMetadata,
);

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

/**
 * TODO:
 * - Add pooled staking vaultApyAverages selector
 * - Add select pooled staking vaultApy selector with formatted (3.2% string) and decimal (new BigNumber(apy).divideBy(100).toNumber()).
 * - Add pooled staking vaultDailyApys selector
 */
