import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';
import {
  selectShouldUseSmartTransaction,
  selectSmartTransactionsEnabled,
} from '../../../../../selectors/smartTransactionsController';
import { selectSmartTransactionsOptInStatus } from '../../../../../selectors/preferencesController';
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
  try {
    const state = getState();
    const isSmartTransactionsUserOptIn =
      selectSmartTransactionsOptInStatus(state);
    const isSmartTransactionsAvailable = selectSmartTransactionsEnabled(
      state,
      transactionMeta.chainId,
    );
    const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
      state,
      transactionMeta.chainId,
    );

    if (!shouldUseSmartTransaction || !isFinalizedEvent(eventType)) {
      return {
        properties: {
          is_smart_transactions_user_opt_in: isSmartTransactionsUserOptIn,
          is_smart_transactions_available: isSmartTransactionsAvailable,
          is_smart_transaction: shouldUseSmartTransaction,
        },
        sensitiveProperties: {},
      };
    }

    const smartMetrics = await getSmartTransactionMetricsProperties(
      smartTransactionsController,
      transactionMeta,
      true,
      initMessenger as unknown as RootExtendedMessenger,
      isSmartTransactionsUserOptIn,
      isSmartTransactionsAvailable,
      shouldUseSmartTransaction,
    );

    return {
      properties: smartMetrics,
      sensitiveProperties: {},
    };
  } catch (error) {
    log('Error getting smart transaction metrics', error);
  }

  return EMPTY_METRICS;
}
