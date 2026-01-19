import type { TransactionMetricsBuilderRequest } from '../types';
import { selectIsPna25FlagEnabled } from '../../../../../selectors/featureFlagController/legalNotices';
import { selectIsPna25Acknowledged } from '../../../../../selectors/legalNotices';
import { isFinalizedEvent } from '../utils';
import { EMPTY_METRICS } from '../constants';

export function getHashMetricsProperties({
  eventType,
  transactionMeta,
  getState,
}: TransactionMetricsBuilderRequest) {
  if (!isFinalizedEvent(eventType)) {
    return EMPTY_METRICS;
  }

  const state = getState();
  const isExtensionUxPna25Enabled = selectIsPna25FlagEnabled(state);
  const isPna25Acknowledged = selectIsPna25Acknowledged(state);

  if (isExtensionUxPna25Enabled && isPna25Acknowledged) {
    return {
      properties: { transaction_hash: transactionMeta.hash },
      sensitiveProperties: {},
    };
  }

  return {
    properties: { transaction_hash: undefined },
    sensitiveProperties: {},
  };
}
