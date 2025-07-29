import { merge } from 'lodash';

export const feeMarketEstimates = {
  low: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '0.01',
    minWaitTimeEstimate: 30000,
    maxWaitTimeEstimate: 60000,
  },
  medium: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '0.0135',
    minWaitTimeEstimate: 20000,
    maxWaitTimeEstimate: 40000,
  },
  high: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '0.017',
    minWaitTimeEstimate: 10000,
    maxWaitTimeEstimate: 15000,
  },
  estimatedBaseFee: '0.01',
  historicalBaseFeeRange: ['0.01', '0.01'],
  baseFeeTrend: 'down',
  latestPriorityFeeRange: ['0.005', '0.01'],
  historicalPriorityFeeRange: ['0.005', '0.01'],
  priorityFeeTrend: 'up',
  networkCongestion: 0,
};

const baseGasFeeControllerMock = {
  engine: {
    backgroundState: {
      GasFeeController: {
        gasFeeEstimates: {},
      },
    },
  },
};

export const gasFeeControllerMock = merge({}, baseGasFeeControllerMock, {
  engine: {
    backgroundState: {
      GasFeeController: {
        gasFeeEstimatesByChainId: {
          '0x1': feeMarketEstimates,
        },
      },
    },
  },
});
