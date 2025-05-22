import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { merge } from 'lodash';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { MetaMetrics } from '../../../../Analytics';
import { BaseControllerMessenger } from '../../../types';
import { generateDefaultTransactionMetrics, generateEvent } from '../utils';
import type { TransactionEventHandlerRequest } from '../types';
import Logger from '../../../../../util/Logger';
import { JsonMap } from '../../../../Analytics/MetaMetrics.types';

// Generic handler for simple transaction events
const createTransactionEventHandler =
  (eventType: (typeof TRANSACTION_EVENTS)[keyof typeof TRANSACTION_EVENTS]) =>
  (
    transactionMeta: TransactionMeta,
    transactionEventHandlerRequest: TransactionEventHandlerRequest,
  ) => {
    const defaultTransactionMetricProperties =
      generateDefaultTransactionMetrics(
        eventType,
        transactionMeta,
        transactionEventHandlerRequest,
      );

    // Create the event using the original format expected by tests
    const event = generateEvent({
      metametricsEvent: eventType,
      properties: defaultTransactionMetricProperties.properties as unknown as JsonMap,
      sensitiveProperties: defaultTransactionMetricProperties.sensitiveProperties,
    });

    MetaMetrics.getInstance().trackEvent(event);
  };

// Simple handlers - no unique properties / actions
export const handleTransactionAddedEventForMetrics = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_ADDED,
);
export const handleTransactionApprovedEventForMetrics = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_APPROVED,
);
export const handleTransactionRejectedEventForMetrics = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_REJECTED,
);
export const handleTransactionSubmittedEventForMetrics = createTransactionEventHandler(
  TRANSACTION_EVENTS.TRANSACTION_SUBMITTED,
);

export async function handleTransactionFinalizedEventForMetrics(
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
): Promise<void> {
  // Generate default properties
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    transactionMeta,
    transactionEventHandlerRequest,
  );

  // Generate smart transaction properties if applicable
  let smartTransactionProperties = { properties: {}, sensitiveProperties: {} };
  try {
    const { getState, initMessenger, smartTransactionsController } = transactionEventHandlerRequest;
    const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
      getState(),
      transactionMeta.chainId,
    );
    if (shouldUseSmartTransaction) {
      const smartMetrics = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        true,
        initMessenger as unknown as BaseControllerMessenger,
      );
      smartTransactionProperties = {
        properties: smartMetrics,
        sensitiveProperties: {},
      };
    }
  } catch (error) {
    Logger.log('Error getting smart transaction metrics:', error);
  }

  // Merge default and smart transaction properties
  const mergedEventProperties = merge({}, defaultTransactionMetricProperties, smartTransactionProperties);

  // Generate and track the event
  const event = generateEvent({
    metametricsEvent: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    properties: mergedEventProperties.properties,
    sensitiveProperties: mergedEventProperties.sensitiveProperties,
  });
  MetaMetrics.getInstance().trackEvent(event);
}
