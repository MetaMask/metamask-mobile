import { MockEventsObject } from '../../../framework';

// Gas fees response for offramp transactions
export const GAS_FEES_RESPONSE = {
  low: {
    suggestedMaxPriorityFeePerGas: '1.5',
    suggestedMaxFeePerGas: '25',
    minWaitTimeEstimate: 60000,
    maxWaitTimeEstimate: 180000,
  },
  medium: {
    suggestedMaxPriorityFeePerGas: '2',
    suggestedMaxFeePerGas: '30',
    minWaitTimeEstimate: 15000,
    maxWaitTimeEstimate: 60000,
  },
  high: {
    suggestedMaxPriorityFeePerGas: '3',
    suggestedMaxFeePerGas: '40',
    minWaitTimeEstimate: 5000,
    maxWaitTimeEstimate: 15000,
  },
  estimatedBaseFee: '22',
  networkCongestion: 0.3,
  latestPriorityFeeRange: ['1', '3'],
  historicalPriorityFeeRange: ['1', '5'],
  historicalBaseFeeRange: ['20', '30'],
  priorityFeeTrend: 'down',
  baseFeeTrend: 'stable',
};
/**
 * Mock data for gas API endpoints used in E2E testing.
 * Returns stable gas fee data to ensure consistent transaction fees.
 * Uses round numbers to make test assertions predictable.
 */
export const DEFAULT_GAS_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/gas\.api\.cx\.metamask\.io\/networks\/\d+\/suggestedGasFees$/,
      response: GAS_FEES_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint:
        /^https:\/\/gas\.api\.cx\.metamask\.io\/networks\/\d+\/gasPrices$/,
      responseCode: 200,
      response: {
        SafeGasPrice: '0',
        ProposeGasPrice: '0',
        FastGasPrice: '0',
      },
    },
  ],
};
