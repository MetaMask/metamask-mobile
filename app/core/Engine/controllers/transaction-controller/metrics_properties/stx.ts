import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { RootExtendedMessenger } from '../../../types';
import { createProjectLogger } from '@metamask/utils';
import { isFinalizedEvent } from '../utils';
import { EMPTY_METRICS } from '../constants';

const log = createProjectLogger('transaction-metrics');

export async function getStxMetricsProperties({
  eventType,
  transactionMeta,
  getState,
  initMessenger,
  smartTransactionsController,
}: TransactionMetricsBuilderRequest): Promise<TransactionMetrics> {
  if (!isFinalizedEvent(eventType)) {
    return EMPTY_METRICS;
  }

  try {
    const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
      getState(),
      transactionMeta.chainId,
    );

    if (shouldUseSmartTransaction) {
      const smartMetrics = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        true,
        initMessenger as unknown as RootExtendedMessenger,
      );

      return {
        properties: smartMetrics,
        sensitiveProperties: {},
      };
    }
  } catch (error) {
    log('Error getting smart transaction metrics', error);
  }

  return EMPTY_METRICS;
}
