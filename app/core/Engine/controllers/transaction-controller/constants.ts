import type { TransactionMetrics } from './types';

export const EMPTY_METRICS: TransactionMetrics = Object.freeze({
  properties: {},
  sensitiveProperties: {},
});
