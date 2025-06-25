import { VaultApyAverages } from '@metamask/stake-sdk';

import {
  CommonPercentageInputUnits,
  PercentageOutputFormat,
  formatPercent,
} from '../../../components/UI/Stake/utils/value';

import BigNumber from 'bignumber.js';

export const getApyData = (vaultApyAverages: VaultApyAverages) =>
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
