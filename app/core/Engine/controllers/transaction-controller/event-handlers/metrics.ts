import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';

import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { MetaMetrics } from '../../../../Analytics';
import { MetricsEventBuilder } from '../../../../Analytics/MetricsEventBuilder';
import { BaseControllerMessenger } from '../../../types';
import { generateDefaultTransactionMetrics, generateEvent, generateRPCProperties } from '../utils';
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

/**
 * Adds smart transaction properties to the event builder if smart transactions are enabled
 */
async function addSmartTransactionProperties(
  eventBuilder: ReturnType<typeof MetricsEventBuilder.createEventBuilder>,
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
): Promise<void> {
  const { getState, initMessenger, smartTransactionsController } = transactionEventHandlerRequest;
  
  try {
    const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
      getState(),
      transactionMeta.chainId,
    );

    if (shouldUseSmartTransaction) {
      const stxMetricsProperties = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        true,
        initMessenger as unknown as BaseControllerMessenger,
      );
      
      eventBuilder.addProperties({
        smart_transaction_timed_out: stxMetricsProperties.smart_transaction_timed_out,
        smart_transaction_proxied: stxMetricsProperties.smart_transaction_proxied,
      } as unknown as JsonMap);
    }
  } catch (error) {
    Logger.log('Error getting smart transaction metrics:', error);
  }
}

/**
 * Adds default properties (RPC + transaction metrics) to the event builder
 */
function addDefaultProperties(
  eventBuilder: ReturnType<typeof MetricsEventBuilder.createEventBuilder>,
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
): void {
  // Add RPC properties
  const rpcProperties = generateRPCProperties(transactionMeta.chainId);
  eventBuilder.addProperties(rpcProperties);

  // Add default transaction properties
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    transactionMeta,
    transactionEventHandlerRequest,
  );

  eventBuilder.addProperties(
    defaultTransactionMetricProperties.properties as unknown as JsonMap
  );

  eventBuilder.addSensitiveProperties(
    defaultTransactionMetricProperties.sensitiveProperties
  );
}

export async function handleTransactionFinalizedEventForMetrics(
  transactionMeta: TransactionMeta,
  transactionEventHandlerRequest: TransactionEventHandlerRequest,
): Promise<void> {
  const eventBuilder = MetricsEventBuilder.createEventBuilder(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED
  );

  await addSmartTransactionProperties(
    eventBuilder,
    transactionMeta,
    transactionEventHandlerRequest,
  );

  addDefaultProperties(
    eventBuilder,
    transactionMeta,
    transactionEventHandlerRequest,
  );

  const event = eventBuilder.build();
  MetaMetrics.getInstance().trackEvent(event);
}
