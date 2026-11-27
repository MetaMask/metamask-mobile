import { MockEventsObject } from '../../../framework';
import type { GasSuggestedGasFeesResponse } from '../../api-response-types';
import { GAS_FEES_RESPONSE } from '../synced/gas-suggested-gas-fees';

export { GAS_FEES_RESPONSE };

// Polygon gas fees response for network 137
export const POLYGON_GAS_FEES_RESPONSE = {
  low: {
    suggestedMaxPriorityFeePerGas: '30',
    suggestedMaxFeePerGas: '45.297546547',
    minWaitTimeEstimate: 2000,
    maxWaitTimeEstimate: 8000,
  },
  medium: {
    suggestedMaxPriorityFeePerGas: '30',
    suggestedMaxFeePerGas: '50.651687839',
    minWaitTimeEstimate: 2000,
    maxWaitTimeEstimate: 6000,
  },
  high: {
    suggestedMaxPriorityFeePerGas: '30',
    suggestedMaxFeePerGas: '56.00582913',
    minWaitTimeEstimate: 2000,
    maxWaitTimeEstimate: 4000,
  },
  estimatedBaseFee: '15.297546547',
  networkCongestion: 0.9067,
  latestPriorityFeeRange: ['27.971358858', '54.974422567'],
  historicalPriorityFeeRange: ['25.007335215', '130'],
  historicalBaseFeeRange: ['14.621185538', '15.355486504'],
  priorityFeeTrend: 'down',
  baseFeeTrend: 'down',
  version: '0.0.1',
} satisfies GasSuggestedGasFeesResponse;

/**
 * Mock data for gas API endpoints used in E2E testing.
 * Returns stable gas fee data to ensure consistent transaction fees.
 * Uses round numbers to make test assertions predictable.
 */
export const DEFAULT_GAS_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/gas\.api\.cx\.metamask\.io\/networks\/137\/suggestedGasFees$/,
      response: POLYGON_GAS_FEES_RESPONSE,
      responseCode: 200,
    },
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
    {
      urlEndpoint:
        /^https:\/\/gas\.api\.cx\.metamask\.io\/v1\/supportedNetworks$/,
      responseCode: 200,
      response: {
        fullSupport: [1],
        partialSupport: {
          optimism: [10],
        },
      },
    },
  ],
};
