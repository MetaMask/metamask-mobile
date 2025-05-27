import { EarnControllerState } from '@metamask-previews/earn-controller';
import {
  PooledStake,
  VaultApyAverages,
  VaultDailyApy,
  VaultData,
} from '@metamask/stake-sdk';
import BigNumber from 'bignumber.js';
import { createSelector } from 'reselect';

import {
  CommonPercentageInputUnits,
  formatPercent,
  PercentageOutputFormat,
} from '../../../components/UI/Stake/utils/value';
import { RootState } from '../../../reducers';

// TODO move to utils
const getApyData = (vaultApyAverages: VaultApyAverages) =>
  vaultApyAverages
    ? {
        apyPercentString: formatPercent(vaultApyAverages.oneWeek, {
          inputFormat: CommonPercentageInputUnits.PERCENTAGE,

          outputFormat: PercentageOutputFormat.PERCENT_SIGN,
          fixed: 1,
        }),
        apyDecimal: new BigNumber(vaultApyAverages.oneWeek)
          .dividedBy(100)
          .toNumber(),
      }
    : {
        apyPercentString: '0%',
        apyDecimal: 0,
      };

// Raw State Selectors
const selectEarnControllerState = (state: RootState) =>
  state.engine.backgroundState.EarnController;

const selectEligibility = createSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) =>
    earnControllerState.pooled_staking.isEligible,
);

const selectPooledStakingPerChain = createSelector(
  selectEarnControllerState,
  (earnControllerState: EarnControllerState) => {
    const pooledStakingPerChain: Record<
      string,
      {
        vaultMetadata: VaultData;
        pooledStakes: PooledStake;
        exchangeRate: string;
        vaultDailyApys: VaultDailyApy[];
        vaultApyAverages: VaultApyAverages;
        vaultApy: {
          apyPercentString: string;
          apyDecimal: number;
        };
      }
    > = {};
    for (const chainId in earnControllerState.pooled_staking) {
      if (isNaN(parseInt(chainId))) {
        continue;
      }
      pooledStakingPerChain[chainId] = {
        vaultMetadata:
          earnControllerState.pooled_staking[chainId].vaultMetadata,
        pooledStakes: earnControllerState.pooled_staking[chainId].pooledStakes,
        exchangeRate: earnControllerState.pooled_staking[chainId].exchangeRate,
        vaultDailyApys:
          earnControllerState.pooled_staking[chainId].vaultDailyApys,
        vaultApyAverages:
          earnControllerState.pooled_staking[chainId].vaultApyAverages,
        vaultApy: getApyData(
          earnControllerState.pooled_staking[chainId].vaultApyAverages,
        ),
      };
    }
    return pooledStakingPerChain;
  },
);

const selectPooledStakingForChain = (chainId: number) =>
  createSelector(
    selectPooledStakingPerChain,
    (pooledStakingPerChain) => pooledStakingPerChain?.[chainId],
  );

const selectVaultMetadataForChain = (chainId: number) =>
  createSelector(
    selectPooledStakingPerChain,
    (pooledStakingPerChain) => pooledStakingPerChain?.[chainId]?.vaultMetadata,
  );

const selectPoolStakesForChain = (chainId: number) =>
  createSelector(
    selectPooledStakingPerChain,
    (pooledStakingPerChain) => pooledStakingPerChain?.[chainId]?.pooledStakes,
  );

const selectExchangeRateForChain = (chainId: number) =>
  createSelector(
    selectPooledStakingPerChain,
    (pooledStakingPerChain) => pooledStakingPerChain?.[chainId]?.exchangeRate,
  );

const selectVaultDailyApysForChain = (chainId: number) =>
  createSelector(
    selectPooledStakingPerChain,
    (pooledStakingPerChain) => pooledStakingPerChain?.[chainId]?.vaultDailyApys,
  );

const selectVaultApyAveragesForChain = (chainId: number) =>
  createSelector(
    selectPooledStakingPerChain,
    (pooledStakingPerChain) =>
      pooledStakingPerChain?.[chainId]?.vaultApyAverages,
  );

const selectVaultApyForChain = (chainId: number) =>
  createSelector(
    selectPooledStakingPerChain,
    (pooledStakingPerChain) => pooledStakingPerChain?.[chainId]?.vaultApy,
  );

export const pooledStakingSelectors = {
  selectEligibility,
  selectPooledStakingPerChain,
  selectPooledStakingForChain,
  selectVaultMetadataForChain,
  selectPoolStakesForChain,
  selectExchangeRateForChain,
  selectVaultDailyApysForChain,
  selectVaultApyAveragesForChain,
  selectVaultApyForChain,
};
