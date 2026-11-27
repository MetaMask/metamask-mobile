import type { GasSuggestedGasFeesResponse } from '../../api-response-types';

/**
 * Kept in sync with the live API by `yarn test:e2e:sync-api-mocks` (see
 * `api-mock-catalog.md`). The sync adds and removes fields and keeps the
 * values below, which tests assert on.
 */
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
  baseFeeTrend: 'level',
  version: '0.0.1',
} satisfies GasSuggestedGasFeesResponse;
