export const feeMarketEstimates = {
  low: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '0.01',
    minWaitTimeEstimate: 250,
    maxWaitTimeEstimate: 1000,
  },
  medium: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '0.0135',
    minWaitTimeEstimate: 250,
    maxWaitTimeEstimate: 750,
  },
  high: {
    suggestedMaxPriorityFeePerGas: '0',
    suggestedMaxFeePerGas: '0.017',
    minWaitTimeEstimate: 250,
    maxWaitTimeEstimate: 500,
  },
  estimatedBaseFee: '0.01',
  historicalBaseFeeRange: ['0.01', '0.01'],
  baseFeeTrend: 'down',
  latestPriorityFeeRange: ['0.005', '0.01'],
  historicalPriorityFeeRange: ['0.005', '0.01'],
  priorityFeeTrend: 'up',
  networkCongestion: 0,
};
