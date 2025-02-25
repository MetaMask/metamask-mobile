import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { EarnControllerState } from '@metamask/earn-controller';
import { createDeepEqualSelector } from './util';
import { VaultApyAverages } from '@metamask/stake-sdk';
import BigNumber from 'bignumber.js';
import {
  CommonPercentageInputUnits,
  formatPercent,
  PercentageOutputFormat,
} from '../components/UI/Stake/utils/value';

// Raw State Selectors
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

export const selectPooledStakingVaultDailyApys = createDeepEqualSelector(
  selectEarnControllerState,
  (earnControllerSate: EarnControllerState) =>
    earnControllerSate.pooled_staking.vaultDailyApys,
);

export const selectPooledStakingVaultApyAverages = createDeepEqualSelector(
  selectEarnControllerState,
  (earnControllerSate: EarnControllerState) =>
    earnControllerSate.pooled_staking.vaultApyAverages,
);

// Derived State Selectors
export const selectPooledStakingVaultApy = createSelector(
  selectPooledStakingVaultApyAverages,
  (vaultApyAverages: VaultApyAverages) => {
    const { oneWeek } = vaultApyAverages;

    const apyPercentString = formatPercent(oneWeek, {
      inputFormat: CommonPercentageInputUnits.PERCENTAGE,
      outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      fixed: 1,
    });

    const apyDecimal = new BigNumber(oneWeek).dividedBy(100).toNumber();

    return {
      // e.g. "2.5%"
      apyPercentString,
      // 0.02522049624725908
      apyDecimal,
    };
  },
);
