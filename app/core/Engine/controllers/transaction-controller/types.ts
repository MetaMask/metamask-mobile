import { JsonMap } from '../../../Analytics/MetaMetrics.types';

// In order to not import from redux slice, type is defined here
export interface TransactionMetrics {
  properties: JsonMap;
  sensitiveProperties: JsonMap;
}

export interface TransactionMetricRequest {
  getTransactionMetricProperties: (id: string) => TransactionMetrics;
}
