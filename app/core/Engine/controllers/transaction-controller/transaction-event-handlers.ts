import { merge } from 'lodash';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../Analytics/events/confirmations';

import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../util/smart-transactions';
import { MetaMetrics } from '../../../Analytics';
import { BaseControllerMessenger } from '../../types';
import { generateDefaultTransactionMetrics, generateEvent } from './utils';
import type { TransactionEventHandlerRequest } from './types';

// Generic handler for simple transaction events
const createTransactionEventHandler = (
  eventType: (typeof TRANSACTION_EVENTS)[keyof typeof TRANSACTION_EVENTS],
) => (
    transactionMeta: TransactionMeta,
    transactionEventHandlerRequest: TransactionEventHandlerRequest,
  ) => {
    const defaultTransactionMetricProperties =
      generateDefaultTransactionMetrics(
        eventType,
        transactionMeta,
        transactionEventHandlerRequest,
      );

    const event = generateEvent(defaultTransactionMetricProperties);
    MetaMetrics.getInstance().trackEvent(event);
  };

// Simple handlers - no unique properties / actions
export const handleTransactionAdded = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_ADDED,
);
export const handleTransactionApproved = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_APPROVED,
);
export const handleTransactionRejected = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_REJECTED,
);
export const handleTransactionSubmitted = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_SUBMITTED,
);

// Intentionally using TRANSACTION_FINALIZED for confirmed/failed/dropped transactions
// as unified type for all finalized transactions.
// Status could be derived from transactionMeta.status
export async function handleTransactionFinalized(
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
) {
  const { getState, initMessenger, smartTransactionsController } =
    transactionEventHandlerRequest;

  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    transactionMeta,
    transactionEventHandlerRequest,
  );

  let stxMetricsProperties = {};

  const shouldUseSmartTransaction = selectShouldUseSmartTransaction(getState());
  if (shouldUseSmartTransaction) {
    stxMetricsProperties = await getSmartTransactionMetricsProperties(
      smartTransactionsController,
      transactionMeta,
      true,
      initMessenger as unknown as BaseControllerMessenger,
    );
  }

  const mergedEventProperties = merge(
    {
      properties: stxMetricsProperties,
    },
    defaultTransactionMetricProperties,
  );

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
}
